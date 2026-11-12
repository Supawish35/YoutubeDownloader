pub mod binaries;
pub mod downloader;
pub mod models;
pub mod settings;
pub mod updater;

use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::RwLock;

use crate::downloader::DownloadManager;
use crate::models::{
    AppSettings, BinaryStatus, MediaFormat, UpdateCheckResult, VideoMetadata, VideoResolution,
};

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub settings: Arc<RwLock<AppSettings>>,
    pub download_manager: DownloadManager,
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let lock = state.settings.read().await;
    Ok(lock.clone())
}

#[tauri::command]
async fn save_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    settings::save_settings_to_disk(&state.app_data_dir, &settings)?;
    let mut lock = state.settings.write().await;
    *lock = settings;
    Ok(())
}

#[tauri::command]
async fn check_binaries(state: State<'_, AppState>) -> Result<BinaryStatus, String> {
    Ok(binaries::check_binaries_status(&state.app_data_dir).await)
}

#[tauri::command]
async fn provision_binaries(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BinaryStatus, String> {
    binaries::ensure_yt_dlp(&app, &state.app_data_dir).await
}

#[tauri::command]
async fn update_yt_dlp(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BinaryStatus, String> {
    binaries::update_yt_dlp_binary(&app, &state.app_data_dir).await
}

#[tauri::command]
fn validate_url(url: String) -> Result<String, String> {
    downloader::validate_youtube_url(&url)
}

#[tauri::command]
async fn fetch_video_info(
    state: State<'_, AppState>,
    url: String,
) -> Result<VideoMetadata, String> {
    let binary_status = binaries::check_binaries_status(&state.app_data_dir).await;
    let yt_dlp_bin = match binary_status.yt_dlp_path {
        Some(p) => p,
        None => {
            return Err(
                "yt-dlp is not installed or available. Please download it first.".to_string(),
            )
        }
    };

    downloader::fetch_metadata(&yt_dlp_bin, &url).await
}

#[tauri::command]
async fn start_download(
    app: AppHandle,
    state: State<'_, AppState>,
    job_id: String,
    url: String,
    format: MediaFormat,
    resolution: Option<VideoResolution>,
    embed_thumbnail: Option<bool>,
    output_dir: Option<String>,
) -> Result<(), String> {
    let binary_status = binaries::check_binaries_status(&state.app_data_dir).await;
    let yt_dlp_bin = match binary_status.yt_dlp_path {
        Some(p) => p,
        None => {
            return Err(
                "yt-dlp is not installed or available. Please download it first.".to_string(),
            )
        }
    };

    let settings = state.settings.read().await;
    let final_resolution = resolution.unwrap_or(settings.default_video_resolution);
    let final_embed = embed_thumbnail.unwrap_or(settings.embed_thumbnail);
    let final_output = output_dir.unwrap_or_else(|| settings.output_dir.clone());
    let ffmpeg_path = binary_status.ffmpeg_path;

    state.download_manager.start_job(
        app,
        job_id,
        url,
        format,
        final_resolution,
        final_embed,
        final_output,
        yt_dlp_bin,
        ffmpeg_path,
    );

    Ok(())
}

#[tauri::command]
async fn cancel_download(state: State<'_, AppState>, job_id: String) -> Result<(), String> {
    state.download_manager.cancel_job(&job_id).await
}

#[tauri::command]
async fn check_app_update() -> Result<UpdateCheckResult, String> {
    updater::check_for_updates().await
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("YoutubeDownloader")
            });

            let loaded_settings = settings::load_settings(&app_data_dir);
            let max_concurrent = loaded_settings.max_concurrent;

            let state = AppState {
                app_data_dir,
                settings: Arc::new(RwLock::new(loaded_settings)),
                download_manager: DownloadManager::new(max_concurrent),
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            check_binaries,
            provision_binaries,
            update_yt_dlp,
            validate_url,
            fetch_video_info,
            start_download,
            cancel_download,
            check_app_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
