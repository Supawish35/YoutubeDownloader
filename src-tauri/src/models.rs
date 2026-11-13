use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Audio,
    Video,
}

impl Default for MediaType {
    fn default() -> Self {
        Self::Audio
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MediaFormat {
    Mp3,
    Ogg,
    Aac,
    Flac,
    Wav,
    Mp4,
    Mkv,
    Webm,
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
            Self::Mkv => "mkv",
            Self::Webm => "webm",
        }
    }

    pub fn is_audio(&self) -> bool {
        matches!(
            self,
            Self::Mp3 | Self::Ogg | Self::Aac | Self::Flac | Self::Wav
        )
    }

    pub fn is_video(&self) -> bool {
        !self.is_audio()
    }

    pub fn media_type(&self) -> MediaType {
        if self.is_video() {
            MediaType::Video
        } else {
            MediaType::Audio
        }
    }

    pub fn supports_cover_art(&self) -> bool {
        matches!(self, Self::Mp3 | Self::Ogg | Self::Aac | Self::Flac)
    }

    pub fn yt_dlp_audio_format(&self) -> &'static str {
        match self {
            Self::Mp3 => "mp3",
            Self::Ogg => "vorbis",
            Self::Aac => "m4a",
            Self::Flac => "flac",
            Self::Wav => "wav",
            Self::Mp4 => "mp4",
            Self::Mkv => "mkv",
            Self::Webm => "webm",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum VideoResolution {
    #[serde(rename = "best")]
    Best,
    #[serde(rename = "1080p")]
    P1080,
    #[serde(rename = "720p")]
    P720,
    #[serde(rename = "480p")]
    P480,
}

impl Default for VideoResolution {
    fn default() -> Self {
        Self::Best
    }
}

impl VideoResolution {
    pub fn max_height(&self) -> Option<u32> {
        match self {
            Self::Best => None,
            Self::P1080 => Some(1080),
            Self::P720 => Some(720),
            Self::P480 => Some(480),
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BrowserCookies {
    None,
    Chrome,
    Firefox,
    Brave,
    Edge,
    Chromium,
    Opera,
    Vivaldi,
    Safari,
}

impl Default for BrowserCookies {
    fn default() -> Self {
        Self::None
    }
}

impl BrowserCookies {
    pub fn as_yt_dlp_arg(&self) -> Option<&'static str> {
        match self {
            Self::None => None,
            Self::Chrome => Some("chrome"),
            Self::Firefox => Some("firefox"),
            Self::Brave => Some("brave"),
            Self::Edge => Some("edge"),
            Self::Chromium => Some("chromium"),
            Self::Opera => Some("opera"),
            Self::Vivaldi => Some("vivaldi"),
            Self::Safari => Some("safari"),
        }
    }
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
    #[serde(default)]
    pub source: String,
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    System,
    Dark,
    Light,
}

impl Default for ThemeMode {
    fn default() -> Self {
        Self::Dark
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AccentColor {
    Vermilion,
    Crimson,
    Cobalt,
    Emerald,
    Amber,
    Monochrome,
}

impl Default for AccentColor {
    fn default() -> Self {
        Self::Vermilion
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UiDensity {
    Compact,
    Comfortable,
    Spacious,
}

impl Default for UiDensity {
    fn default() -> Self {
        Self::Comfortable
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CornerStyle {
    Balanced,
    Sharp,
}

impl Default for CornerStyle {
    fn default() -> Self {
        Self::Balanced
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FontScale {
    Xs,
    Sm,
    Md,
    Lg,
    Xl,
}

impl Default for FontScale {
    fn default() -> Self {
        Self::Md
    }
}

fn default_show_thumbnails() -> bool {
    true
}

fn default_audio_format() -> MediaFormat {
    MediaFormat::Mp3
}

fn default_video_format() -> MediaFormat {
    MediaFormat::Mp4
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub output_dir: String,
    pub default_format: MediaFormat,
    #[serde(default)]
    pub default_type: MediaType,
    #[serde(default = "default_audio_format")]
    pub default_audio_format: MediaFormat,
    #[serde(default = "default_video_format")]
    pub default_video_format: MediaFormat,
    #[serde(default)]
    pub default_video_resolution: VideoResolution,
    pub embed_thumbnail: bool,
    pub dark_mode: bool,
    pub max_concurrent: usize,
    #[serde(default)]
    pub theme_mode: ThemeMode,
    #[serde(default)]
    pub accent_color: AccentColor,
    #[serde(default)]
    pub density: UiDensity,
    #[serde(default)]
    pub corner_style: CornerStyle,
    #[serde(default)]
    pub font_scale: FontScale,
    #[serde(default = "default_show_thumbnails")]
    pub show_thumbnails: bool,
    #[serde(default)]
    pub cookies_browser: BrowserCookies,
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
