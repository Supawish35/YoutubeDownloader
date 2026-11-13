export type MediaType = 'audio' | 'video';

export type AudioFormat = 'mp3' | 'ogg' | 'aac' | 'flac' | 'wav';

export type VideoFormat = 'mp4' | 'mkv' | 'webm';

export type MediaFormat = AudioFormat | VideoFormat;

export type VideoResolution = 'best' | '1080p' | '720p' | '480p';

export type DownloadStatus =
  | 'queued'
  | 'fetchingMeta'
  | 'downloading'
  | 'converting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BrowserCookies =
  | 'none'
  | 'chrome'
  | 'firefox'
  | 'brave'
  | 'edge'
  | 'chromium'
  | 'opera'
  | 'vivaldi'
  | 'safari';

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSecs: number | null;
  thumbnailUrl: string | null;
  source?: string;
}

export interface ProgressPayload {
  jobId: string;
  status: DownloadStatus;
  percent: number;
  speed: string | null;
  eta: string | null;
  outputPath: string | null;
  error: string | null;
}

export type ThemeMode = 'system' | 'dark' | 'light';

export type AccentColor =
  | 'vermilion'
  | 'crimson'
  | 'cobalt'
  | 'emerald'
  | 'amber'
  | 'monochrome';

export type UiDensity = 'compact' | 'comfortable' | 'spacious';

export type CornerStyle = 'balanced' | 'sharp';

export type FontScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type FilenameTemplate = 'titleId' | 'titleOnly' | 'channelTitle';

export interface AppSettings {
  outputDir: string;
  defaultFormat: MediaFormat;
  defaultType: MediaType;
  defaultAudioFormat: AudioFormat;
  defaultVideoFormat: VideoFormat;
  defaultVideoResolution: VideoResolution;
  embedThumbnail: boolean;
  darkMode: boolean;
  maxConcurrent: number;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  density: UiDensity;
  cornerStyle: CornerStyle;
  fontScale: FontScale;
  showThumbnails: boolean;
  cookiesBrowser: BrowserCookies;
  filenameTemplate: FilenameTemplate;
}

export interface DownloadItemOptions {
  clipStart?: string;
  clipEnd?: string;
  embedSubs?: boolean;
}

export interface PlaylistEntry {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSecs: number | null;
  thumbnailUrl: string | null;
}

export interface PlaylistMetadata {
  title: string;
  entries: PlaylistEntry[];
}

export interface BinaryStatus {
  ytDlpPath: string | null;
  ytDlpVersion: string | null;
  ytDlpSource: string;
  ffmpegPath: string | null;
  ffmpegVersion: string | null;
  ffmpegAvailable: boolean;
  ready: boolean;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

export interface QueueItem {
  jobId: string;
  url: string;
  format: MediaFormat;
  resolution?: VideoResolution;
  embedThumbnail: boolean;
  clipStart?: string;
  clipEnd?: string;
  embedSubs?: boolean;
  status: DownloadStatus;
  percent: number;
  speed: string | null;
  eta: string | null;
  outputPath: string | null;
  error: string | null;
  metadata: VideoMetadata | null;
  addedAt: number;
}

export type QueueFilter = 'all' | 'active' | 'completed' | 'failed';
