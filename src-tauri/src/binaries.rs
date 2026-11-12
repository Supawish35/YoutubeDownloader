use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

use crate::models::BinaryStatus;

#[cfg(target_os = "windows")]
pub const YT_DLP_BINARY_NAME: &str = "yt-dlp.exe";
#[cfg(not(target_os = "windows"))]
pub const YT_DLP_BINARY_NAME: &str = "yt-dlp";

#[cfg(target_os = "windows")]
pub const FFMPEG_BINARY_NAME: &str = "ffmpeg.exe";
#[cfg(not(target_os = "windows"))]
pub const FFMPEG_BINARY_NAME: &str = "ffmpeg";

pub fn get_download_asset_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "yt-dlp.exe"
    }
    #[cfg(target_os = "macos")]
    {
        "yt-dlp_macos"
    }
    #[cfg(target_os = "linux")]
    {
        "yt-dlp_linux"
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "yt-dlp"
    }
}

pub async fn get_binary_version(bin_path: &Path, arg: &str) -> Option<String> {
    let output = tokio::process::Command::new(bin_path)
        .arg(arg)
        .output()
        .await
        .ok()?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !text.is_empty() {
            return Some(text);
        }
    }
    None
}

pub async fn get_ffmpeg_version(bin_path: &Path) -> Option<String> {
    let output = tokio::process::Command::new(bin_path)
        .arg("-version")
        .output()
        .await
        .ok()?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout);
        if let Some(first_line) = text.lines().next() {
            return Some(first_line.trim().to_string());
        }
    }
    None
}

pub async fn check_binaries_status(app_data_dir: &Path) -> BinaryStatus {
    let managed_bin_dir = app_data_dir.join("bin");
    let managed_yt_dlp = managed_bin_dir.join(YT_DLP_BINARY_NAME);
    let managed_ffmpeg = managed_bin_dir.join(FFMPEG_BINARY_NAME);

    // 1. Resolve yt-dlp: check managed first, then system which
    let (yt_dlp_path, yt_dlp_source, yt_dlp_version) = if managed_yt_dlp.is_file() {
        let ver = get_binary_version(&managed_yt_dlp, "--version").await;
        (
            Some(managed_yt_dlp.to_string_lossy().to_string()),
            "managed".to_string(),
            ver,
        )
    } else if let Ok(sys_path) = which::which(YT_DLP_BINARY_NAME) {
        let ver = get_binary_version(&sys_path, "--version").await;
        (
            Some(sys_path.to_string_lossy().to_string()),
            "system".to_string(),
            ver,
        )
    } else {
        (None, "missing".to_string(), None)
    };

    // 2. Resolve ffmpeg: check managed first, then system which
    let (ffmpeg_path, ffmpeg_version) = if managed_ffmpeg.is_file() {
        let ver = get_ffmpeg_version(&managed_ffmpeg).await;
        (Some(managed_ffmpeg.to_string_lossy().to_string()), ver)
    } else if let Ok(sys_path) = which::which(FFMPEG_BINARY_NAME) {
        let ver = get_ffmpeg_version(&sys_path).await;
        (Some(sys_path.to_string_lossy().to_string()), ver)
    } else {
        (None, None)
    };

    let ffmpeg_available = ffmpeg_path.is_some();
    let ready = yt_dlp_path.is_some() && ffmpeg_available;

    BinaryStatus {
        yt_dlp_path,
        yt_dlp_version,
        yt_dlp_source,
        ffmpeg_path,
        ffmpeg_version,
        ffmpeg_available,
        ready,
    }
}

pub async fn download_yt_dlp(app_data_dir: &Path) -> Result<PathBuf, String> {
    let bin_dir = app_data_dir.join("bin");
    fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("Failed to create bin dir {}: {e}", bin_dir.display()))?;

    let asset_name = get_download_asset_name();
    let download_url = format!(
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/{asset_name}"
    );

    let client = reqwest::Client::builder()
        .user_agent("YoutubeDownloader/2.0.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download yt-dlp from {download_url}: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download yt-dlp: HTTP {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let dest_path = bin_dir.join(YT_DLP_BINARY_NAME);
    let tmp_path = bin_dir.join(format!("{}.tmp", YT_DLP_BINARY_NAME));

    fs::write(&tmp_path, bytes)
        .map_err(|e| format!("Failed to write temporary binary: {e}"))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&tmp_path, fs::Permissions::from_mode(0o755));
    }

    fs::rename(&tmp_path, &dest_path)
        .map_err(|e| format!("Failed to rename binary into place: {e}"))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&dest_path, fs::Permissions::from_mode(0o755));
    }

    Ok(dest_path)
}

pub async fn ensure_yt_dlp(app: &AppHandle, app_data_dir: &Path) -> Result<BinaryStatus, String> {
    let mut status = check_binaries_status(app_data_dir).await;
    if status.yt_dlp_path.is_none() {
        download_yt_dlp(app_data_dir).await?;
        status = check_binaries_status(app_data_dir).await;
    }
    let _ = app.emit("binary-status", &status);
    Ok(status)
}

pub async fn update_yt_dlp_binary(
    app: &AppHandle,
    app_data_dir: &Path,
) -> Result<BinaryStatus, String> {
    let current_status = check_binaries_status(app_data_dir).await;

    let mut updated = false;
    if current_status.yt_dlp_source == "managed" {
        if let Some(ref path) = current_status.yt_dlp_path {
            let output = tokio::process::Command::new(path)
                .arg("-U")
                .output()
                .await;
            if let Ok(out) = output {
                if out.status.success() {
                    updated = true;
                }
            }
        }
    }

    if !updated {
        download_yt_dlp(app_data_dir).await?;
    }

    let status = check_binaries_status(app_data_dir).await;
    let _ = app.emit("binary-status", &status);
    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asset_name_not_empty() {
        let asset = get_download_asset_name();
        assert!(!asset.is_empty());
        #[cfg(target_os = "linux")]
        assert_eq!(asset, "yt-dlp_linux");
        #[cfg(target_os = "windows")]
        assert_eq!(asset, "yt-dlp.exe");
        #[cfg(target_os = "macos")]
        assert_eq!(asset, "yt-dlp_macos");
    }

    #[tokio::test]
    async fn test_check_binaries_status_empty_dir() {
        let temp_dir = std::env::temp_dir().join(format!("yt_bin_test_{}", uuid::Uuid::new_v4()));
        let status = check_binaries_status(&temp_dir).await;
        // Either system yt-dlp is found or it's missing
        assert!(status.yt_dlp_source == "system" || status.yt_dlp_source == "missing");
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
