use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MediaFormat {
    Mp3,
    Ogg,
    Aac,
    Flac,
    Wav,
    Mp4,
}

impl Default for MediaFormat {
    fn default() -> Self {
        Self::Mp3
    }
}

impl MediaFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Mp3 => "mp3",
            Self::Ogg => "ogg",
            Self::Aac => "aac",
            Self::Flac => "flac",
            Self::Wav => "wav",
            Self::Mp4 => "mp4",
        }
    }

    pub fn is_audio(&self) -> bool {
        !matches!(self, Self::Mp4)
    }

    pub fn yt_dlp_audio_format(&self) -> &'static str {
        match self {
            Self::Mp3 => "mp3",
            Self::Ogg => "vorbis",
            Self::Aac => "m4a",
            Self::Flac => "flac",
            Self::Wav => "wav",
            Self::Mp4 => "mp4",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DownloadStatus {
    Queued,
    FetchingMeta,
    Downloading,
    Converting,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    pub id: String,
    pub url: String,
    pub title: String,
    pub channel: String,
    pub duration_secs: Option<u64>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub job_id: String,
    pub status: DownloadStatus,
    pub percent: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub output_dir: String,
    pub default_format: MediaFormat,
    pub embed_thumbnail: bool,
    pub dark_mode: bool,
    pub max_concurrent: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BinaryStatus {
    pub yt_dlp_path: Option<String>,
    pub yt_dlp_version: Option<String>,
    pub yt_dlp_source: String,
    pub ffmpeg_path: Option<String>,
    pub ffmpeg_version: Option<String>,
    pub ffmpeg_available: bool,
    pub ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_url: String,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}
