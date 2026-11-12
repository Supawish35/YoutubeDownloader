use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::{watch, Mutex, Semaphore};

use crate::models::{DownloadStatus, MediaFormat, ProgressPayload, VideoMetadata};

pub fn validate_youtube_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }

    let scheme_end = match trimmed.find("://") {
        Some(idx) => idx + 3,
        None => return Err("Invalid URL format".to_string()),
    };

    let rest = &trimmed[scheme_end..];
    let host_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let host = &rest[..host_end].to_lowercase();
    let host_clean = host.split(':').next().unwrap_or(host);

    let valid_hosts = [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
    ];

    if !valid_hosts.contains(&host_clean) {
        return Err(format!("Invalid YouTube host: {host_clean}"));
    }

    Ok(trimmed.to_string())
}

pub fn build_yt_dlp_args(
    url: &str,
    format: &MediaFormat,
    embed_thumbnail: bool,
    output_dir: &str,
    ffmpeg_path: Option<&str>,
) -> Vec<String> {
    let mut args = vec![
        "--no-playlist".to_string(),
        "--newline".to_string(),
        "--embed-metadata".to_string(),
        "--progress-template".to_string(),
        "download:PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s"
            .to_string(),
        "--print".to_string(),
        "after_move:FILEPATH:%(filepath)s".to_string(),
    ];

    if let Some(ffmpeg) = ffmpeg_path {
        args.push("--ffmpeg-location".to_string());
        args.push(ffmpeg.to_string());
    }

    if format.is_audio() {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push(format.yt_dlp_audio_format().to_string());
        args.push("--audio-quality".to_string());
        args.push("0".to_string());
    } else if *format == MediaFormat::Mp4 {
        args.push("-f".to_string());
        args.push("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best".to_string());
        args.push("--merge-output-format".to_string());
        args.push("mp4".to_string());
    }

    if embed_thumbnail {
        args.push("--embed-thumbnail".to_string());
        args.push("--convert-thumbnails".to_string());
        args.push("jpg".to_string());
    }

    let clean_out = output_dir.trim_end_matches(['/', '\\']);
    args.push("-o".to_string());
    args.push(format!("{clean_out}/%(title).150B [%(id)s].%(ext)s"));

    args.push(url.to_string());

    args
}

pub fn parse_progress_line(line: &str) -> Option<(f64, Option<String>, Option<String>)> {
    let marker = "PROGRESS:";
    let idx = line.find(marker)?;
    let content = &line[idx + marker.len()..];

    let parts: Vec<&str> = content.split('|').collect();
    if parts.is_empty() {
        return None;
    }

    let percent_str = parts[0].trim().trim_end_matches('%').trim();
    let percent = percent_str.parse::<f64>().ok()?;

    let clean_str = |s: &str| -> Option<String> {
        let trimmed = s.trim();
        if trimmed.is_empty()
            || trimmed.eq_ignore_ascii_case("N/A")
            || trimmed.eq_ignore_ascii_case("Unknown")
        {
            None
        } else {
            Some(trimmed.to_string())
        }
    };

    let speed = parts.get(1).and_then(|s| clean_str(s));
    let eta = parts.get(2).and_then(|s| clean_str(s));

    Some((percent, speed, eta))
}

pub async fn fetch_metadata(yt_dlp_bin: &str, url: &str) -> Result<VideoMetadata, String> {
    let validated_url = validate_youtube_url(url)?;

    let output = tokio::process::Command::new(yt_dlp_bin)
        .args(["--dump-single-json", "--no-playlist", "--no-warnings"])
        .arg(&validated_url)
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {e}"))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp metadata fetch failed: {err_msg}"));
    }

    let val: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse metadata JSON: {e}"))?;

    let id = val
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let title = val
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown Title")
        .to_string();
    let channel = val
        .get("uploader")
        .or_else(|| val.get("channel"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown Channel")
        .to_string();
    let duration_secs = val.get("duration").and_then(|v| v.as_u64());
    let thumbnail_url = val
        .get("thumbnail")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(VideoMetadata {
        id,
        url: validated_url,
        title,
        channel,
        duration_secs,
        thumbnail_url,
    })
}

#[derive(Clone)]
pub struct DownloadManager {
    semaphore: Arc<Semaphore>,
    active_cancellations: Arc<Mutex<HashMap<String, watch::Sender<bool>>>>,
}

impl DownloadManager {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent.max(1))),
            active_cancellations: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        url: String,
        format: MediaFormat,
        embed_thumbnail: bool,
        output_dir: String,
        yt_dlp_bin: String,
        ffmpeg_path: Option<String>,
    ) {
        let sem = Arc::clone(&self.semaphore);
        let cancellations = Arc::clone(&self.active_cancellations);
        let j_id = job_id.clone();

        let (cancel_tx, mut cancel_rx) = watch::channel(false);

        tokio::spawn(async move {
            {
                let mut map = cancellations.lock().await;
                map.insert(j_id.clone(), cancel_tx);
            }

            let emit_progress = |status: DownloadStatus,
                                 percent: f64,
                                 speed: Option<String>,
                                 eta: Option<String>,
                                 output_path: Option<String>,
                                 error: Option<String>| {
                let payload = ProgressPayload {
                    job_id: j_id.clone(),
                    status,
                    percent,
                    speed,
                    eta,
                    output_path,
                    error,
                };
                let _ = app.emit("download-progress", payload);
            };

            emit_progress(DownloadStatus::Queued, 0.0, None, None, None, None);

            let permit = tokio::select! {
                res = sem.acquire() => {
                    match res {
                        Ok(p) => p,
                        Err(e) => {
                            emit_progress(DownloadStatus::Failed, 0.0, None, None, None, Some(format!("Semaphore error: {e}")));
                            cancellations.lock().await.remove(&j_id);
                            return;
                        }
                    }
                }
                _ = cancel_rx.changed() => {
                    if *cancel_rx.borrow() {
                        emit_progress(DownloadStatus::Cancelled, 0.0, None, None, None, None);
                        cancellations.lock().await.remove(&j_id);
                        return;
                    }
                    return;
                }
            };

            emit_progress(DownloadStatus::FetchingMeta, 0.0, None, None, None, None);

            let args = build_yt_dlp_args(
                &url,
                &format,
                embed_thumbnail,
                &output_dir,
                ffmpeg_path.as_deref(),
            );

            let mut cmd = tokio::process::Command::new(&yt_dlp_bin);
            cmd.args(&args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped());

            let mut child = match cmd.spawn() {
                Ok(c) => c,
                Err(e) => {
                    emit_progress(
                        DownloadStatus::Failed,
                        0.0,
                        None,
                        None,
                        None,
                        Some(format!("Failed to spawn yt-dlp: {e}")),
                    );
                    drop(permit);
                    cancellations.lock().await.remove(&j_id);
                    return;
                }
            };

            let stdout = child.stdout.take();
            let stderr = child.stderr.take();

            let mut captured_filepath: Option<String> = None;
            let mut last_error_msg: Option<String> = None;

            let mut stdout_reader = stdout.map(|s| BufReader::new(s).lines());
            let mut stderr_reader = stderr.map(|s| BufReader::new(s).lines());

            loop {
                tokio::select! {
                    _ = cancel_rx.changed() => {
                        if *cancel_rx.borrow() {
                            let _ = child.kill().await;
                            emit_progress(DownloadStatus::Cancelled, 0.0, None, None, None, None);
                            drop(permit);
                            cancellations.lock().await.remove(&j_id);
                            return;
                        }
                    }
                    line_res = async {
                        if let Some(ref mut reader) = stdout_reader {
                            reader.next_line().await
                        } else {
                            futures_util::future::pending().await
                        }
                    } => {
                        match line_res {
                            Ok(Some(line)) => {
                                if line.contains("FILEPATH:") {
                                    if let Some(idx) = line.find("FILEPATH:") {
                                        let path = line[idx + "FILEPATH:".len()..].trim().to_string();
                                        if !path.is_empty() {
                                            captured_filepath = Some(path);
                                        }
                                    }
                                } else if let Some((percent, speed, eta)) = parse_progress_line(&line) {
                                    emit_progress(DownloadStatus::Downloading, percent, speed, eta, None, None);
                                } else if line.contains("[ExtractAudio]") || line.contains("[Merger]") || line.contains("[EmbedThumbnail]") {
                                    emit_progress(DownloadStatus::Converting, 100.0, None, None, None, None);
                                }
                            }
                            Ok(None) => {
                                stdout_reader = None;
                            }
                            Err(_) => {}
                        }
                    }
                    err_line_res = async {
                        if let Some(ref mut reader) = stderr_reader {
                            reader.next_line().await
                        } else {
                            futures_util::future::pending().await
                        }
                    } => {
                        match err_line_res {
                            Ok(Some(line)) => {
                                if line.contains("ERROR:") {
                                    last_error_msg = Some(line.trim().to_string());
                                }
                            }
                            Ok(None) => {
                                stderr_reader = None;
                            }
                            Err(_) => {}
                        }
                    }
                    exit_status = child.wait() => {
                        if let Some(mut reader) = stdout_reader.take() {
                            while let Ok(Some(line)) = reader.next_line().await {
                                if line.contains("FILEPATH:") {
                                    if let Some(idx) = line.find("FILEPATH:") {
                                        let path = line[idx + "FILEPATH:".len()..].trim().to_string();
                                        if !path.is_empty() {
                                            captured_filepath = Some(path);
                                        }
                                    }
                                }
                            }
                        }

                        drop(permit);
                        cancellations.lock().await.remove(&j_id);

                        match exit_status {
                            Ok(status) if status.success() => {
                                emit_progress(
                                    DownloadStatus::Completed,
                                    100.0,
                                    None,
                                    None,
                                    captured_filepath,
                                    None,
                                );
                            }
                            Ok(status) => {
                                let err = last_error_msg.unwrap_or_else(|| {
                                    format!("yt-dlp exited with status {status}")
                                });
                                emit_progress(
                                    DownloadStatus::Failed,
                                    0.0,
                                    None,
                                    None,
                                    None,
                                    Some(err),
                                );
                            }
                            Err(e) => {
                                emit_progress(
                                    DownloadStatus::Failed,
                                    0.0,
                                    None,
                                    None,
                                    None,
                                    Some(format!("Error waiting for yt-dlp: {e}")),
                                );
                            }
                        }
                        break;
                    }
                }
            }
        });
    }

    pub async fn cancel_job(&self, job_id: &str) -> Result<(), String> {
        let map = self.active_cancellations.lock().await;
        if let Some(sender) = map.get(job_id) {
            let _ = sender.send(true);
            Ok(())
        } else {
            Err(format!("No active download job found with id: {job_id}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_youtube_url_valid() {
        let valid_urls = [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtube.com/shorts/abcdef12345",
            "https://youtube.com/watch?v=123&t=45s",
        ];

        for u in valid_urls {
            let res = validate_youtube_url(u);
            assert!(res.is_ok(), "Expected {u} to be valid");
            assert_eq!(res.unwrap(), u);
        }
    }

    #[test]
    fn test_validate_youtube_url_invalid() {
        let invalid_urls = [
            "https://vimeo.com/123456",
            "https://notyoutube.com/watch?v=123",
            "ftp://youtube.com/watch?v=123",
            "just plain text",
            "https://malicious-youtube.com/watch?v=123",
            "",
        ];

        for u in invalid_urls {
            let res = validate_youtube_url(u);
            assert!(res.is_err(), "Expected {u} to be invalid");
        }
    }

    #[test]
    fn test_build_yt_dlp_args_audio() {
        let url = "https://www.youtube.com/watch?v=test";
        let out_dir = "/home/user/downloads/";
        let ffmpeg = Some("/usr/bin/ffmpeg");

        let formats = [
            (MediaFormat::Mp3, "mp3"),
            (MediaFormat::Ogg, "vorbis"),
            (MediaFormat::Aac, "m4a"),
            (MediaFormat::Flac, "flac"),
            (MediaFormat::Wav, "wav"),
        ];

        for (format, expected_audio_fmt) in formats {
            let args = build_yt_dlp_args(url, &format, true, out_dir, ffmpeg);
            assert!(args.contains(&"--no-playlist".to_string()));
            assert!(args.contains(&"--newline".to_string()));
            assert!(args.contains(&"--embed-metadata".to_string()));
            assert!(args.contains(&"--ffmpeg-location".to_string()));
            assert!(args.contains(&"/usr/bin/ffmpeg".to_string()));
            assert!(args.contains(&"-x".to_string()));
            assert!(args.contains(&"--audio-format".to_string()));
            assert!(args.contains(&expected_audio_fmt.to_string()));
            assert!(args.contains(&"--audio-quality".to_string()));
            assert!(args.contains(&"0".to_string()));
            assert!(args.contains(&"--embed-thumbnail".to_string()));
            assert!(args.contains(&"--convert-thumbnails".to_string()));
            assert!(args.contains(&"jpg".to_string()));
            assert_eq!(args.last().unwrap(), url);
        }
    }

    #[test]
    fn test_build_yt_dlp_args_video_mp4() {
        let url = "https://www.youtube.com/watch?v=test";
        let out_dir = "/home/user/downloads";

        let args = build_yt_dlp_args(url, &MediaFormat::Mp4, false, out_dir, None);
        assert!(!args.contains(&"-x".to_string()));
        assert!(!args.contains(&"--embed-thumbnail".to_string()));
        assert!(args.contains(&"-f".to_string()));
        assert!(args.contains(
            &"bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best".to_string()
        ));
        assert!(args.contains(&"--merge-output-format".to_string()));
        assert!(args.contains(&"mp4".to_string()));
        assert!(args.contains(&"-o".to_string()));
        assert!(args.contains(&"/home/user/downloads/%(title).150B [%(id)s].%(ext)s".to_string()));
        assert_eq!(args.last().unwrap(), url);
    }

    #[test]
    fn test_parse_progress_line() {
        let line = "download:PROGRESS: 45.2%| 3.21MiB/s|00:12";
        let parsed = parse_progress_line(line);
        assert_eq!(
            parsed,
            Some((45.2, Some("3.21MiB/s".to_string()), Some("00:12".to_string())))
        );

        let line_100 = "PROGRESS: 100.0%| 10.5MiB/s|00:00";
        assert_eq!(
            parse_progress_line(line_100),
            Some((100.0, Some("10.5MiB/s".to_string()), Some("00:00".to_string())))
        );

        let line_na = "PROGRESS: 100%|N/A|Unknown";
        assert_eq!(parse_progress_line(line_na), Some((100.0, None, None)));

        let line_invalid = "some random log line without marker";
        assert_eq!(parse_progress_line(line_invalid), None);
    }
}
