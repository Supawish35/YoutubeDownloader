use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::{watch, Mutex, Semaphore};

use crate::models::{
    DownloadStatus, FilenameTemplate, MediaFormat, PlaylistEntry, PlaylistMetadata,
    ProgressPayload, VideoMetadata, VideoResolution,
};

#[derive(Debug, Clone, Default)]
pub struct DownloadOptions {
    pub filename_template: FilenameTemplate,
    pub clip_start: Option<String>,
    pub clip_end: Option<String>,
    pub embed_subs: bool,
}

fn extract_clean_host(trimmed: &str) -> Result<String, String> {
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }
    if trimmed.chars().any(char::is_whitespace) {
        return Err("URL cannot contain whitespace".to_string());
    }

    let scheme_end = match trimmed.find("://") {
        Some(idx) => idx + 3,
        None => return Err("Invalid URL format".to_string()),
    };

    let rest = &trimmed[scheme_end..];
    let authority_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let authority = &rest[..authority_end];
    let host_port = authority.rsplit('@').next().unwrap_or(authority);
    let host_clean = host_port
        .split(':')
        .next()
        .unwrap_or(host_port)
        .to_lowercase();

    if host_clean.is_empty()
        || !host_clean.contains('.')
        || host_clean.starts_with('.')
        || host_clean.ends_with('.')
        || host_clean.contains("..")
        || !host_clean
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
    {
        return Err(format!("Invalid media URL host: {host_clean}"));
    }

    Ok(host_clean)
}

fn host_matches(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{domain}"))
}

pub fn detect_source_label(url: &str) -> String {
    let Ok(host) = extract_clean_host(url.trim()) else {
        return "Web".to_string();
    };

    if host_matches(&host, "youtube.com") || host_matches(&host, "youtu.be") {
        "YouTube".to_string()
    } else if host_matches(&host, "tiktok.com") {
        "TikTok".to_string()
    } else if host_matches(&host, "facebook.com")
        || host_matches(&host, "fb.watch")
        || host_matches(&host, "fb.gg")
        || host_matches(&host, "fb.com")
    {
        "Facebook".to_string()
    } else if host_matches(&host, "x.com")
        || host_matches(&host, "twitter.com")
        || host_matches(&host, "t.co")
        || host_matches(&host, "vxtwitter.com")
        || host_matches(&host, "fxtwitter.com")
    {
        "X".to_string()
    } else if host_matches(&host, "instagram.com") || host_matches(&host, "instagr.am") {
        "Instagram".to_string()
    } else if host_matches(&host, "soundcloud.com") {
        "SoundCloud".to_string()
    } else if host_matches(&host, "vimeo.com") {
        "Vimeo".to_string()
    } else if host_matches(&host, "twitch.tv") {
        "Twitch".to_string()
    } else if host_matches(&host, "reddit.com") || host_matches(&host, "redd.it") {
        "Reddit".to_string()
    } else if host_matches(&host, "bilibili.com") || host_matches(&host, "b23.tv") {
        "Bilibili".to_string()
    } else if host_matches(&host, "dailymotion.com") || host_matches(&host, "dai.ly") {
        "Dailymotion".to_string()
    } else if host_matches(&host, "bandcamp.com") {
        "Bandcamp".to_string()
    } else {
        host.strip_prefix("www.")
            .or_else(|| host.strip_prefix("m."))
            .unwrap_or(&host)
            .to_string()
    }
}

fn normalize_extractor_source(extractor: Option<&str>, url: &str) -> String {
    match extractor.map(|s| s.trim().to_ascii_lowercase()).as_deref() {
        Some(k) if k.starts_with("youtube") => "YouTube".to_string(),
        Some(k) if k.starts_with("tiktok") => "TikTok".to_string(),
        Some(k) if k.starts_with("facebook") => "Facebook".to_string(),
        Some("twitter") | Some("x") => "X".to_string(),
        Some(k) if k.starts_with("instagram") => "Instagram".to_string(),
        Some(k) if k.starts_with("soundcloud") => "SoundCloud".to_string(),
        Some(k) if k.starts_with("vimeo") => "Vimeo".to_string(),
        Some(k) if k.starts_with("twitch") => "Twitch".to_string(),
        Some(k) if k.starts_with("reddit") => "Reddit".to_string(),
        Some(k) if k.starts_with("bilibili") => "Bilibili".to_string(),
        Some(k) if k.starts_with("dailymotion") => "Dailymotion".to_string(),
        Some(k) if k.starts_with("bandcamp") => "Bandcamp".to_string(),
        Some(_) => detect_source_label(url),
        None => detect_source_label(url),
    }
}

pub fn validate_media_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    extract_clean_host(trimmed)?;
    Ok(trimmed.to_string())
}

fn build_video_selector(format: &MediaFormat, resolution: VideoResolution) -> (String, &'static str) {
    let h = resolution
        .max_height()
        .map(|px| format!("[height<={px}]"))
        .unwrap_or_default();

    match format {
        MediaFormat::Mp4 => (
            format!(
                "bestvideo{h}[ext=mp4]+bestaudio[ext=m4a]/bestvideo{h}+bestaudio/best{h}[ext=mp4]/best{h}/best"
            ),
            "mp4",
        ),
        MediaFormat::Mkv => (
            format!("bestvideo{h}+bestaudio/best{h}/best"),
            "mkv",
        ),
        MediaFormat::Webm => (
            format!(
                "bestvideo{h}[ext=webm]+bestaudio[ext=webm]/bestvideo{h}[vcodec^=vp9]+bestaudio[acodec^=opus]/best{h}[ext=webm]/best{h}/best"
            ),
            "webm",
        ),
        _ => (format!("bestvideo{h}+bestaudio/best"), "mp4"),
    }
}

pub fn build_yt_dlp_args(
    url: &str,
    format: &MediaFormat,
    resolution: VideoResolution,
    embed_thumbnail: bool,
    output_dir: &str,
    ffmpeg_path: Option<&str>,
    cookies_browser: Option<&str>,
) -> Vec<String> {
    build_yt_dlp_args_with_options(
        url,
        format,
        resolution,
        embed_thumbnail,
        output_dir,
        ffmpeg_path,
        cookies_browser,
        &DownloadOptions::default(),
    )
}

pub fn build_yt_dlp_args_with_options(
    url: &str,
    format: &MediaFormat,
    resolution: VideoResolution,
    embed_thumbnail: bool,
    output_dir: &str,
    ffmpeg_path: Option<&str>,
    cookies_browser: Option<&str>,
    options: &DownloadOptions,
) -> Vec<String> {
    let mut args = vec![
        "--no-playlist".to_string(),
        "--newline".to_string(),
        "--windows-filenames".to_string(),
        "--embed-metadata".to_string(),
        "--progress-template".to_string(),
        "download:PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s"
            .to_string(),
        "--print".to_string(),
        "after_move:FILEPATH:%(filepath)s".to_string(),
    ];

    if let Some(browser) = cookies_browser.map(str::trim).filter(|b| !b.is_empty()) {
        args.push("--cookies-from-browser".to_string());
        args.push(browser.to_string());
    }

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
    } else {
        let (selector, container) = build_video_selector(format, resolution);
        args.push("-f".to_string());
        args.push(selector);
        args.push("--merge-output-format".to_string());
        args.push(container.to_string());
    }

    if embed_thumbnail && format.supports_cover_art() {
        args.push("--embed-thumbnail".to_string());
        args.push("--convert-thumbnails".to_string());
        args.push("jpg".to_string());
    }

    if options.embed_subs && format.is_video() {
        args.push("--embed-subs".to_string());
        args.push("--sub-langs".to_string());
        args.push("en.*,all,-live_chat".to_string());
    }

    let clip_start = options
        .clip_start
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let clip_end = options
        .clip_end
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    if clip_start.is_some() || clip_end.is_some() {
        let start = clip_start.unwrap_or("0:00");
        let end = clip_end.unwrap_or("inf");
        args.push("--download-sections".to_string());
        args.push(format!("*{start}-{end}"));
    }

    let clean_out = output_dir.trim_end_matches(['/', '\\']);
    let pattern = options.filename_template.as_yt_dlp_pattern();
    args.push("-o".to_string());
    args.push(format!("{clean_out}/{pattern}"));

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

pub async fn fetch_metadata(
    yt_dlp_bin: &str,
    url: &str,
    cookies_browser: Option<&str>,
) -> Result<VideoMetadata, String> {
    let validated_url = validate_media_url(url)?;

    let mut cmd = tokio::process::Command::new(yt_dlp_bin);
    cmd.args(["--dump-single-json", "--no-playlist", "--no-warnings"]);
    if let Some(browser) = cookies_browser.map(str::trim).filter(|b| !b.is_empty()) {
        cmd.args(["--cookies-from-browser", browser]);
    }
    cmd.arg(&validated_url);

    let output = cmd
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
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("Untitled Media")
        .to_string();
    let source = normalize_extractor_source(
        val.get("extractor_key")
            .or_else(|| val.get("extractor"))
            .and_then(|v| v.as_str()),
        &validated_url,
    );
    let channel = val
        .get("uploader")
        .or_else(|| val.get("channel"))
        .or_else(|| val.get("creator"))
        .or_else(|| val.get("uploader_id"))
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&source)
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
        source,
    })
}

pub fn parse_playlist_json(raw_json: &[u8], fallback_url: &str) -> Result<PlaylistMetadata, String> {
    let val: serde_json::Value =
        serde_json::from_slice(raw_json).map_err(|e| format!("Failed to parse playlist JSON: {e}"))?;

    let playlist_title = val
        .get("title")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("Playlist")
        .to_string();

    let playlist_channel = val
        .get("uploader")
        .or_else(|| val.get("channel"))
        .or_else(|| val.get("uploader_id"))
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let raw_entries: Vec<&serde_json::Value> = match val.get("entries").and_then(|v| v.as_array()) {
        Some(arr) => arr.iter().collect(),
        None => vec![&val],
    };

    let mut entries = Vec::new();
    for entry in raw_entries {
        if entry.is_null() {
            continue;
        }

        let id = entry
            .get("id")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .unwrap_or("")
            .to_string();

        let http_url = entry
            .get("webpage_url")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| s.starts_with("http"))
            .or_else(|| {
                entry
                    .get("url")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| s.starts_with("http"))
            });

        let entry_url = match http_url {
            Some(u) => u.to_string(),
            None if !id.is_empty() => format!("https://www.youtube.com/watch?v={id}"),
            None => fallback_url.to_string(),
        };

        let title = entry
            .get("title")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or("Untitled Media")
            .to_string();

        let channel = entry
            .get("uploader")
            .or_else(|| entry.get("channel"))
            .or_else(|| entry.get("creator"))
            .or_else(|| entry.get("uploader_id"))
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .or(playlist_channel)
            .map(str::to_string)
            .unwrap_or_else(|| detect_source_label(&entry_url));

        let duration_secs = entry.get("duration").and_then(|v| {
            v.as_u64()
                .or_else(|| v.as_f64().filter(|f| *f >= 0.0).map(|f| f.round() as u64))
        });

        let thumbnail_url = entry
            .get("thumbnail")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .or_else(|| {
                entry
                    .get("thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|t| t.get("url"))
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(str::to_string)
            });

        entries.push(PlaylistEntry {
            id,
            url: entry_url,
            title,
            channel,
            duration_secs,
            thumbnail_url,
        });
    }

    Ok(PlaylistMetadata {
        title: playlist_title,
        entries,
    })
}

pub async fn fetch_playlist_metadata(
    yt_dlp_bin: &str,
    url: &str,
    cookies_browser: Option<&str>,
) -> Result<PlaylistMetadata, String> {
    let validated_url = validate_media_url(url)?;

    let mut cmd = tokio::process::Command::new(yt_dlp_bin);
    cmd.args(["--flat-playlist", "--dump-single-json", "--no-warnings"]);
    if let Some(browser) = cookies_browser.map(str::trim).filter(|b| !b.is_empty()) {
        cmd.args(["--cookies-from-browser", browser]);
    }
    cmd.arg(&validated_url);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {e}"))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp playlist fetch failed: {err_msg}"));
    }

    parse_playlist_json(&output.stdout, &validated_url)
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
        resolution: VideoResolution,
        embed_thumbnail: bool,
        output_dir: String,
        yt_dlp_bin: String,
        ffmpeg_path: Option<String>,
        cookies_browser: Option<String>,
        options: DownloadOptions,
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

            let args = build_yt_dlp_args_with_options(
                &url,
                &format,
                resolution,
                embed_thumbnail,
                &output_dir,
                ffmpeg_path.as_deref(),
                cookies_browser.as_deref(),
                &options,
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
    fn test_validate_media_url_valid_platforms() {
        let valid_cases = [
            ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "YouTube"),
            ("http://www.youtube.com/watch?v=dQw4w9WgXcQ", "YouTube"),
            ("https://youtu.be/dQw4w9WgXcQ", "YouTube"),
            ("https://m.youtube.com/watch?v=dQw4w9WgXcQ", "YouTube"),
            ("https://music.youtube.com/watch?v=dQw4w9WgXcQ", "YouTube"),
            ("https://youtube.com/shorts/abcdef12345", "YouTube"),
            ("https://www.tiktok.com/@creator/video/71234567890", "TikTok"),
            ("https://vm.tiktok.com/ZM8abc123/", "TikTok"),
            ("https://www.facebook.com/watch/?v=123456789", "Facebook"),
            ("https://fb.watch/abc123XYZ/", "Facebook"),
            ("https://x.com/user/status/1234567890", "X"),
            ("https://twitter.com/user/status/1234567890", "X"),
            ("https://www.instagram.com/reel/C123456/", "Instagram"),
            ("https://soundcloud.com/artist/track", "SoundCloud"),
            ("https://vimeo.com/123456", "Vimeo"),
            ("https://clips.twitch.tv/ClipSlugHere", "Twitch"),
            ("https://www.reddit.com/r/videos/comments/abc/title/", "Reddit"),
        ];

        for (u, expected_source) in valid_cases {
            let res = validate_media_url(u);
            assert!(res.is_ok(), "Expected {u} to be valid");
            assert_eq!(res.unwrap(), u);
            assert_eq!(detect_source_label(u), expected_source);
        }
    }

    #[test]
    fn test_validate_media_url_invalid() {
        let invalid_urls = [
            "ftp://youtube.com/watch?v=123",
            "just plain text",
            "https://localhost",
            "https://not a valid url.com/watch",
            "https://.invalid.com/video",
            "https://invalid..com/video",
            "",
        ];

        for u in invalid_urls {
            let res = validate_media_url(u);
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
            let args = build_yt_dlp_args(
                url,
                &format,
                VideoResolution::Best,
                true,
                out_dir,
                ffmpeg,
                Some("firefox"),
            );
            assert!(args.contains(&"--no-playlist".to_string()));
            assert!(args.contains(&"--newline".to_string()));
            assert!(args.contains(&"--windows-filenames".to_string()));
            assert!(args.contains(&"--embed-metadata".to_string()));
            assert!(args.contains(&"--cookies-from-browser".to_string()));
            assert!(args.contains(&"firefox".to_string()));
            assert!(args.contains(&"--ffmpeg-location".to_string()));
            assert!(args.contains(&"/usr/bin/ffmpeg".to_string()));
            assert!(args.contains(&"-x".to_string()));
            assert!(args.contains(&"--audio-format".to_string()));
            assert!(args.contains(&expected_audio_fmt.to_string()));
            assert!(args.contains(&"--audio-quality".to_string()));
            assert!(args.contains(&"0".to_string()));
            if format.supports_cover_art() {
                assert!(args.contains(&"--embed-thumbnail".to_string()));
                assert!(args.contains(&"--convert-thumbnails".to_string()));
                assert!(args.contains(&"jpg".to_string()));
            } else {
                assert!(!args.contains(&"--embed-thumbnail".to_string()));
            }
            assert_eq!(args.last().unwrap(), url);
        }
    }

    #[test]
    fn test_build_yt_dlp_args_video_containers_and_resolutions() {
        let url = "https://www.tiktok.com/@user/video/123";
        let out_dir = "/home/user/downloads";

        let mp4_best = build_yt_dlp_args(
            url,
            &MediaFormat::Mp4,
            VideoResolution::Best,
            true,
            out_dir,
            None,
            None,
        );
        assert!(!mp4_best.contains(&"-x".to_string()));
        assert!(!mp4_best.contains(&"--cookies-from-browser".to_string()));
        // Cover art should be skipped on video formats even when embed_thumbnail is true
        assert!(!mp4_best.contains(&"--embed-thumbnail".to_string()));
        assert!(mp4_best.contains(&"--merge-output-format".to_string()));
        assert!(mp4_best.contains(&"mp4".to_string()));
        assert!(mp4_best.contains(&"/home/user/downloads/%(title).150B [%(id)s].%(ext)s".to_string()));
        assert_eq!(mp4_best.last().unwrap(), url);

        let mkv_1080 = build_yt_dlp_args(
            url,
            &MediaFormat::Mkv,
            VideoResolution::P1080,
            false,
            out_dir,
            None,
            None,
        );
        assert!(mkv_1080.contains(&"bestvideo[height<=1080]+bestaudio/best[height<=1080]/best".to_string()));
        assert!(mkv_1080.contains(&"mkv".to_string()));

        let webm_720 = build_yt_dlp_args(
            url,
            &MediaFormat::Webm,
            VideoResolution::P720,
            false,
            out_dir,
            None,
            None,
        );
        let selector_idx = webm_720.iter().position(|a| a == "-f").unwrap() + 1;
        assert!(webm_720[selector_idx].contains("[height<=720][ext=webm]"));
        assert!(webm_720.contains(&"webm".to_string()));
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

    #[test]
    fn test_build_yt_dlp_args_with_options_clip_subs_and_template() {
        let url = "https://www.youtube.com/watch?v=abc123";
        let out_dir = "/tmp/out/";

        let opts = DownloadOptions {
            filename_template: FilenameTemplate::ChannelTitle,
            clip_start: Some(" 00:15 ".to_string()),
            clip_end: Some(" 01:45 ".to_string()),
            embed_subs: true,
        };
        let video_args = build_yt_dlp_args_with_options(
            url,
            &MediaFormat::Mp4,
            VideoResolution::P1080,
            false,
            out_dir,
            None,
            None,
            &opts,
        );
        assert!(video_args.contains(&"--embed-subs".to_string()));
        assert!(video_args.contains(&"--sub-langs".to_string()));
        assert!(video_args.contains(&"en.*,all,-live_chat".to_string()));
        assert!(video_args.contains(&"--download-sections".to_string()));
        assert!(video_args.contains(&"*00:15-01:45".to_string()));
        assert!(video_args.contains(&"/tmp/out/%(uploader)s - %(title).150B.%(ext)s".to_string()));

        // Partial clip bounds should default start to 0:00 and end to inf, and audio ignores embed_subs
        let audio_opts = DownloadOptions {
            filename_template: FilenameTemplate::TitleOnly,
            clip_start: Some("01:00".to_string()),
            clip_end: Some("   ".to_string()),
            embed_subs: true,
        };
        let audio_args = build_yt_dlp_args_with_options(
            url,
            &MediaFormat::Mp3,
            VideoResolution::Best,
            true,
            out_dir,
            None,
            None,
            &audio_opts,
        );
        assert!(!audio_args.contains(&"--embed-subs".to_string()));
        assert!(audio_args.contains(&"*01:00-inf".to_string()));
        assert!(audio_args.contains(&"/tmp/out/%(title).150B.%(ext)s".to_string()));

        let end_only_opts = DownloadOptions {
            filename_template: FilenameTemplate::TitleId,
            clip_start: None,
            clip_end: Some("02:00".to_string()),
            embed_subs: false,
        };
        let end_only_args = build_yt_dlp_args_with_options(
            url,
            &MediaFormat::Mkv,
            VideoResolution::Best,
            false,
            out_dir,
            None,
            None,
            &end_only_opts,
        );
        assert!(end_only_args.contains(&"*0:00-02:00".to_string()));
        assert!(end_only_args.contains(&"/tmp/out/%(title).150B [%(id)s].%(ext)s".to_string()));
    }

    #[test]
    fn test_parse_playlist_json() {
        let playlist_json = br#"{
            "title": "My Awesome Mix",
            "uploader": "Fallback Channel",
            "entries": [
                {
                    "id": "vid1",
                    "url": "https://www.youtube.com/watch?v=vid1",
                    "title": "Track One",
                    "uploader": "Artist One",
                    "duration": 215.0,
                    "thumbnail": "https://img.example.com/1.jpg"
                },
                {
                    "id": "vid2",
                    "url": "vid2",
                    "title": "Track Two",
                    "duration": 180,
                    "thumbnails": [{"url": "https://img.example.com/2.jpg"}]
                }
            ]
        }"#;

        let parsed = parse_playlist_json(playlist_json, "https://www.youtube.com/playlist?list=PL1")
            .expect("playlist JSON should parse");
        assert_eq!(parsed.title, "My Awesome Mix");
        assert_eq!(parsed.entries.len(), 2);
        assert_eq!(parsed.entries[0].url, "https://www.youtube.com/watch?v=vid1");
        assert_eq!(parsed.entries[0].channel, "Artist One");
        assert_eq!(parsed.entries[0].duration_secs, Some(215));
        assert_eq!(
            parsed.entries[0].thumbnail_url.as_deref(),
            Some("https://img.example.com/1.jpg")
        );

        assert_eq!(parsed.entries[1].url, "https://www.youtube.com/watch?v=vid2");
        assert_eq!(parsed.entries[1].channel, "Fallback Channel");
        assert_eq!(parsed.entries[1].duration_secs, Some(180));
        assert_eq!(
            parsed.entries[1].thumbnail_url.as_deref(),
            Some("https://img.example.com/2.jpg")
        );

        // Single video JSON without entries wraps into a 1-item entries vec
        let single_json = br#"{
            "id": "single99",
            "webpage_url": "https://vimeo.com/999",
            "title": "Solo Clip",
            "uploader": "Creator",
            "duration": 42
        }"#;
        let single = parse_playlist_json(single_json, "https://vimeo.com/999")
            .expect("single video JSON should parse");
        assert_eq!(single.title, "Solo Clip");
        assert_eq!(single.entries.len(), 1);
        assert_eq!(single.entries[0].id, "single99");
        assert_eq!(single.entries[0].url, "https://vimeo.com/999");
        assert_eq!(single.entries[0].channel, "Creator");
        assert_eq!(single.entries[0].duration_secs, Some(42));
    }
}
