use std::fs;
use std::path::Path;

use crate::models::{AppSettings, MediaFormat};

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
            embed_thumbnail: true,
            dark_mode: true,
            max_concurrent: 3,
        }
    }
}

pub fn load_settings(app_data_dir: &Path) -> AppSettings {
    let settings_path = app_data_dir.join("settings.json");
    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&settings_path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                return settings;
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
        assert!(settings.embed_thumbnail);
        assert!(settings.dark_mode);
        assert_eq!(settings.max_concurrent, 3);
        assert!(!settings.output_dir.is_empty());
    }

    #[test]
    fn test_settings_serde_camel_case() {
        let settings = AppSettings {
            output_dir: "/tmp/downloads".to_string(),
            default_format: MediaFormat::Mp4,
            embed_thumbnail: false,
            dark_mode: false,
            max_concurrent: 5,
        };

        let json = serde_json::to_string(&settings).expect("serialization should succeed");
        assert!(json.contains("\"outputDir\":\"/tmp/downloads\""));
        assert!(json.contains("\"defaultFormat\":\"mp4\""));
        assert!(json.contains("\"embedThumbnail\":false"));
        assert!(json.contains("\"darkMode\":false"));
        assert!(json.contains("\"maxConcurrent\":5"));

        let deserialized: AppSettings =
            serde_json::from_str(&json).expect("deserialization should succeed");
        assert_eq!(deserialized, settings);
    }

    #[test]
    fn test_save_and_load_round_trip() {
        let temp_dir = std::env::temp_dir().join(format!("yt_test_{}", uuid::Uuid::new_v4()));
        let custom_settings = AppSettings {
            output_dir: "/custom/path".to_string(),
            default_format: MediaFormat::Flac,
            embed_thumbnail: false,
            dark_mode: false,
            max_concurrent: 4,
        };

        let save_res = save_settings_to_disk(&temp_dir, &custom_settings);
        assert!(save_res.is_ok());

        let loaded = load_settings(&temp_dir);
        assert_eq!(loaded, custom_settings);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
