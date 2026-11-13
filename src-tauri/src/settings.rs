use std::fs;
use std::path::Path;

use crate::models::{
    AccentColor, AppSettings, BrowserCookies, CornerStyle, FontScale, MediaFormat, MediaType,
    ThemeMode, UiDensity, VideoResolution,
};

impl Default for AppSettings {
    fn default() -> Self {
        let output_dir = dirs::download_dir()
            .or_else(dirs::audio_dir)
            .or_else(dirs::home_dir)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string());

        Self {
            output_dir,
            default_format: MediaFormat::Mp3,
            default_type: MediaType::Audio,
            default_audio_format: MediaFormat::Mp3,
            default_video_format: MediaFormat::Mp4,
            default_video_resolution: VideoResolution::Best,
            embed_thumbnail: true,
            dark_mode: true,
            max_concurrent: 3,
            theme_mode: ThemeMode::Dark,
            accent_color: AccentColor::Vermilion,
            density: UiDensity::Comfortable,
            corner_style: CornerStyle::Balanced,
            font_scale: FontScale::Md,
            show_thumbnails: true,
            cookies_browser: BrowserCookies::None,
        }
    }
}

/// Normalize legacy `settings.json` files created before separated audio/video defaults existed.
fn normalize_loaded_settings(mut settings: AppSettings, raw_json: &str) -> AppSettings {
    if let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(raw_json)
    {
        if !map.contains_key("defaultType") {
            settings.default_type = settings.default_format.media_type();
        }
        if !map.contains_key("defaultAudioFormat") && settings.default_format.is_audio() {
            settings.default_audio_format = settings.default_format;
        }
        if !map.contains_key("defaultVideoFormat") && settings.default_format.is_video() {
            settings.default_video_format = settings.default_format;
        }
    }

    if !settings.default_audio_format.is_audio() {
        settings.default_audio_format = MediaFormat::Mp3;
    }
    if !settings.default_video_format.is_video() {
        settings.default_video_format = MediaFormat::Mp4;
    }

    settings.default_format = match settings.default_type {
        MediaType::Audio => settings.default_audio_format,
        MediaType::Video => settings.default_video_format,
    };

    settings
}

pub fn load_settings(app_data_dir: &Path) -> AppSettings {
    let settings_path = app_data_dir.join("settings.json");
    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&settings_path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                return normalize_loaded_settings(settings, &content);
            }
        }
    }
    AppSettings::default()
}

pub fn save_settings_to_disk(app_data_dir: &Path, settings: &AppSettings) -> Result<(), String> {
    if !app_data_dir.exists() {
        fs::create_dir_all(app_data_dir)
            .map_err(|e| format!("Failed to create settings directory: {e}"))?;
    }
    let settings_path = app_data_dir.join("settings.json");
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {e}"))?;
    fs::write(&settings_path, json).map_err(|e| format!("Failed to write settings file: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = AppSettings::default();
        assert_eq!(settings.default_format, MediaFormat::Mp3);
        assert_eq!(settings.default_type, MediaType::Audio);
        assert_eq!(settings.default_audio_format, MediaFormat::Mp3);
        assert_eq!(settings.default_video_format, MediaFormat::Mp4);
        assert_eq!(settings.default_video_resolution, VideoResolution::Best);
        assert!(settings.embed_thumbnail);
        assert!(settings.dark_mode);
        assert_eq!(settings.max_concurrent, 3);
        assert!(!settings.output_dir.is_empty());
        assert_eq!(settings.theme_mode, ThemeMode::Dark);
        assert_eq!(settings.accent_color, AccentColor::Vermilion);
        assert_eq!(settings.density, UiDensity::Comfortable);
        assert_eq!(settings.corner_style, CornerStyle::Balanced);
        assert_eq!(settings.font_scale, FontScale::Md);
        assert!(settings.show_thumbnails);
        assert_eq!(settings.cookies_browser, BrowserCookies::None);
    }

    #[test]
    fn test_settings_serde_camel_case() {
        let settings = AppSettings {
            output_dir: "/tmp/downloads".to_string(),
            default_format: MediaFormat::Mkv,
            default_type: MediaType::Video,
            default_audio_format: MediaFormat::Flac,
            default_video_format: MediaFormat::Mkv,
            default_video_resolution: VideoResolution::P1080,
            embed_thumbnail: false,
            dark_mode: false,
            max_concurrent: 5,
            theme_mode: ThemeMode::System,
            accent_color: AccentColor::Cobalt,
            density: UiDensity::Spacious,
            corner_style: CornerStyle::Sharp,
            font_scale: FontScale::Xl,
            show_thumbnails: false,
            cookies_browser: BrowserCookies::Firefox,
        };

        let json = serde_json::to_string(&settings).expect("serialization should succeed");
        assert!(json.contains("\"outputDir\":\"/tmp/downloads\""));
        assert!(json.contains("\"defaultFormat\":\"mkv\""));
        assert!(json.contains("\"defaultType\":\"video\""));
        assert!(json.contains("\"defaultAudioFormat\":\"flac\""));
        assert!(json.contains("\"defaultVideoFormat\":\"mkv\""));
        assert!(json.contains("\"defaultVideoResolution\":\"1080p\""));
        assert!(json.contains("\"embedThumbnail\":false"));
        assert!(json.contains("\"darkMode\":false"));
        assert!(json.contains("\"maxConcurrent\":5"));
        assert!(json.contains("\"themeMode\":\"system\""));
        assert!(json.contains("\"accentColor\":\"cobalt\""));
        assert!(json.contains("\"density\":\"spacious\""));
        assert!(json.contains("\"cornerStyle\":\"sharp\""));
        assert!(json.contains("\"fontScale\":\"xl\""));
        assert!(json.contains("\"showThumbnails\":false"));
        assert!(json.contains("\"cookiesBrowser\":\"firefox\""));

        let deserialized: AppSettings =
            serde_json::from_str(&json).expect("deserialization should succeed");
        assert_eq!(deserialized, settings);
    }

    #[test]
    fn test_legacy_settings_deserialization_backward_compat() {
        let legacy_json = r#"{
            "outputDir": "/legacy/downloads",
            "defaultFormat": "mp4",
            "embedThumbnail": false,
            "darkMode": false,
            "maxConcurrent": 2
        }"#;

        let parsed: AppSettings =
            serde_json::from_str(legacy_json).expect("legacy JSON should deserialize");
        let deserialized = normalize_loaded_settings(parsed, legacy_json);
        assert_eq!(deserialized.output_dir, "/legacy/downloads");
        assert_eq!(deserialized.default_format, MediaFormat::Mp4);
        assert_eq!(deserialized.default_type, MediaType::Video);
        assert_eq!(deserialized.default_audio_format, MediaFormat::Mp3);
        assert_eq!(deserialized.default_video_format, MediaFormat::Mp4);
        assert_eq!(deserialized.default_video_resolution, VideoResolution::Best);
        assert!(!deserialized.embed_thumbnail);
        assert!(!deserialized.dark_mode);
        assert_eq!(deserialized.max_concurrent, 2);
        assert_eq!(deserialized.theme_mode, ThemeMode::Dark);
        assert_eq!(deserialized.accent_color, AccentColor::Vermilion);
        assert_eq!(deserialized.density, UiDensity::Comfortable);
        assert_eq!(deserialized.corner_style, CornerStyle::Balanced);
        assert_eq!(deserialized.font_scale, FontScale::Md);
        assert!(deserialized.show_thumbnails);
    }

    #[test]
    fn test_save_and_load_round_trip() {
        let temp_dir = std::env::temp_dir().join(format!("yt_test_{}", uuid::Uuid::new_v4()));
        let custom_settings = AppSettings {
            output_dir: "/custom/path".to_string(),
            default_format: MediaFormat::Flac,
            default_type: MediaType::Audio,
            default_audio_format: MediaFormat::Flac,
            default_video_format: MediaFormat::Webm,
            default_video_resolution: VideoResolution::P720,
            embed_thumbnail: false,
            dark_mode: false,
            max_concurrent: 4,
            theme_mode: ThemeMode::Light,
            accent_color: AccentColor::Monochrome,
            density: UiDensity::Compact,
            corner_style: CornerStyle::Sharp,
            font_scale: FontScale::Xs,
            show_thumbnails: false,
            cookies_browser: BrowserCookies::Chrome,
        };

        let save_res = save_settings_to_disk(&temp_dir, &custom_settings);
        assert!(save_res.is_ok());

        let loaded = load_settings(&temp_dir);
        assert_eq!(loaded, custom_settings);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
