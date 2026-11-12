export type MediaFormat = 'mp3' | 'ogg' | 'aac' | 'flac' | 'wav' | 'mp4';

export type DownloadStatus =
  | 'queued'
  | 'fetchingMeta'
  | 'downloading'
  | 'converting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSecs: number | null;
  thumbnailUrl: string | null;
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

export interface AppSettings {
  outputDir: string;
  defaultFormat: MediaFormat;
  embedThumbnail: boolean;
  darkMode: boolean;
  maxConcurrent: number;
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
  embedThumbnail: boolean;
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
