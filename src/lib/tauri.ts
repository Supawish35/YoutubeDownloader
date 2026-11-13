import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import type {
  AppSettings,
  BinaryStatus,
  MediaFormat,
  PlaylistMetadata,
  ProgressPayload,
  UpdateCheckResult,
  VideoMetadata,
  VideoResolution,
} from '~types/downloader';
import { getMediaTypeForFormat, isAudioFormat, isVideoFormat } from '@/lib/mediaFormats';
import { detectMediaSource } from '@/lib/mediaSources';

const PREVIEW_SETTINGS_KEY = 'ytd_preview_settings';

const DEFAULT_PREVIEW_SETTINGS: AppSettings = {
  outputDir: '~/Downloads',
  defaultFormat: 'mp3',
  defaultType: 'audio',
  defaultAudioFormat: 'mp3',
  defaultVideoFormat: 'mp4',
  defaultVideoResolution: 'best',
  embedThumbnail: true,
  darkMode: true,
  maxConcurrent: 3,
  themeMode: 'dark',
  accentColor: 'vermilion',
  density: 'comfortable',
  cornerStyle: 'balanced',
  fontScale: 'md',
  showThumbnails: true,
  cookiesBrowser: 'none',
  filenameTemplate: 'titleId',
};

let previewBinaryState: BinaryStatus = {
  ytDlpPath: '/usr/local/bin/yt-dlp',
  ytDlpVersion: '2025.02.19',
  ytDlpSource: 'managed',
  ffmpegPath: '/usr/bin/ffmpeg',
  ffmpegVersion: 'ffmpeg version 7.1',
  ffmpegAvailable: true,
  ready: true,
};

const previewProgressListeners = new Set<(payload: ProgressPayload) => void>();
const previewBinaryListeners = new Set<(payload: BinaryStatus) => void>();
const previewJobTimers = new Map<string, number[]>();

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function loadPreviewSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(PREVIEW_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings> | null;
      if (parsed && typeof parsed === 'object') {
        const sanitized = Object.fromEntries(
          Object.entries(parsed).filter(([, value]) => value !== undefined && value !== null)
        ) as Partial<AppSettings>;
        const merged = { ...DEFAULT_PREVIEW_SETTINGS, ...sanitized };
        if (!parsed.defaultType) {
          merged.defaultType = getMediaTypeForFormat(merged.defaultFormat);
        }
        if (!parsed.defaultAudioFormat && isAudioFormat(merged.defaultFormat)) {
          merged.defaultAudioFormat = merged.defaultFormat;
        }
        if (!parsed.defaultVideoFormat && isVideoFormat(merged.defaultFormat)) {
          merged.defaultVideoFormat = merged.defaultFormat;
        }
        return merged;
      }
    }
  } catch {
    // Ignore storage errors in preview mode
  }
  return { ...DEFAULT_PREVIEW_SETTINGS };
}

function validateMediaUrlLocal(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }
  if (/\s/.test(trimmed)) {
    throw new Error('URL cannot contain whitespace');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    !host.includes('.') ||
    host.startsWith('.') ||
    host.endsWith('.') ||
    host.includes('..')
  ) {
    throw new Error(`Invalid media URL host: ${host}`);
  }
  return trimmed;
}

function extractPreviewVideoId(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || 'dQw4w9WgXcQ';
    }
    const vParam = parsed.searchParams.get('v');
    if (vParam) return vParam;
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'media-item';
  } catch {
    return 'media-item';
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (!isTauri()) {
    return loadPreviewSettings();
  }
  return invoke<AppSettings>('get_settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!isTauri()) {
    try {
      window.localStorage.setItem(PREVIEW_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors in preview mode
    }
    return;
  }
  await invoke<void>('save_settings', { settings });
}

export async function checkBinaries(): Promise<BinaryStatus> {
  if (!isTauri()) {
    return { ...previewBinaryState };
  }
  return invoke<BinaryStatus>('check_binaries');
}

export async function provisionBinaries(): Promise<BinaryStatus> {
  if (!isTauri()) {
    previewBinaryState = {
      ...previewBinaryState,
      ytDlpPath: previewBinaryState.ytDlpPath ?? '/usr/local/bin/yt-dlp',
      ytDlpVersion: previewBinaryState.ytDlpVersion ?? '2025.02.19',
      ytDlpSource: 'managed',
      ready: previewBinaryState.ffmpegAvailable,
    };
    previewBinaryListeners.forEach((cb) => cb({ ...previewBinaryState }));
    return { ...previewBinaryState };
  }
  return invoke<BinaryStatus>('provision_binaries');
}

export async function updateYtDlp(): Promise<BinaryStatus> {
  if (!isTauri()) {
    previewBinaryState = {
      ...previewBinaryState,
      ytDlpVersion: '2025.02.19',
      ytDlpSource: 'managed',
      ready: previewBinaryState.ffmpegAvailable,
    };
    previewBinaryListeners.forEach((cb) => cb({ ...previewBinaryState }));
    return { ...previewBinaryState };
  }
  return invoke<BinaryStatus>('update_yt_dlp');
}

export async function validateUrl(url: string): Promise<string> {
  if (!isTauri()) {
    return validateMediaUrlLocal(url);
  }
  return invoke<string>('validate_url', { url });
}

export async function fetchVideoInfo(url: string): Promise<VideoMetadata> {
  if (!isTauri()) {
    const validated = validateMediaUrlLocal(url);
    const id = extractPreviewVideoId(validated);
    const source = detectMediaSource(validated);
    return {
      id,
      url: validated,
      title: `Preview ${source} Media (${id})`,
      channel: `${source} Preview Creator`,
      durationSecs: 215,
      thumbnailUrl:
        source === 'YouTube' ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
      source,
    };
  }
  return invoke<VideoMetadata>('fetch_video_info', { url });
}

export async function fetchPlaylistInfo(url: string): Promise<PlaylistMetadata> {
  if (!isTauri()) {
    const validated = validateMediaUrlLocal(url);
    const id = extractPreviewVideoId(validated);
    const source = detectMediaSource(validated);
    const thumb =
      source === 'YouTube' ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
    return {
      title: `Preview ${source} Playlist (${id})`,
      entries: [
        {
          id: `${id}-1`,
          url: validated,
          title: `Preview Track 01 — ${source} Session`,
          channel: `${source} Preview Creator`,
          durationSecs: 198,
          thumbnailUrl: thumb,
        },
        {
          id: `${id}-2`,
          url: validated,
          title: `Preview Track 02 — ${source} Deep Dive`,
          channel: `${source} Preview Creator`,
          durationSecs: 312,
          thumbnailUrl: thumb,
        },
        {
          id: `${id}-3`,
          url: validated,
          title: `Preview Track 03 — ${source} Encore`,
          channel: `${source} Preview Creator`,
          durationSecs: 245,
          thumbnailUrl: thumb,
        },
      ],
    };
  }
  return invoke<PlaylistMetadata>('fetch_playlist_info', { url });
}

export interface StartDownloadParams {
  jobId: string;
  url: string;
  format: MediaFormat;
  resolution?: VideoResolution;
  embedThumbnail?: boolean;
  outputDir?: string;
  clipStart?: string;
  clipEnd?: string;
  embedSubs?: boolean;
}

export async function startDownload(params: StartDownloadParams): Promise<void> {
  if (!isTauri()) {
    const validated = validateMediaUrlLocal(params.url);
    const id = extractPreviewVideoId(validated);
    const settings = loadPreviewSettings();
    const outDir = (params.outputDir ?? settings.outputDir).replace(/[/\\]+$/, '');
    const ext = params.format === 'aac' ? 'm4a' : params.format;
    const emit = (payload: ProgressPayload) => {
      previewProgressListeners.forEach((cb) => cb(payload));
    };

    const existing = previewJobTimers.get(params.jobId);
    if (existing) {
      existing.forEach((t) => window.clearTimeout(t));
    }

    const timers: number[] = [];
    const schedule = (delay: number, payload: ProgressPayload) => {
      const timerId = window.setTimeout(() => emit(payload), delay);
      timers.push(timerId);
    };

    schedule(50, {
      jobId: params.jobId,
      status: 'fetchingMeta',
      percent: 0,
      speed: null,
      eta: null,
      outputPath: null,
      error: null,
    });
    schedule(450, {
      jobId: params.jobId,
      status: 'downloading',
      percent: 32.4,
      speed: '4.12 MiB/s',
      eta: '00:08',
      outputPath: null,
      error: null,
    });
    schedule(950, {
      jobId: params.jobId,
      status: 'downloading',
      percent: 78.9,
      speed: '5.40 MiB/s',
      eta: '00:02',
      outputPath: null,
      error: null,
    });
    schedule(1400, {
      jobId: params.jobId,
      status: 'converting',
      percent: 100,
      speed: null,
      eta: null,
      outputPath: null,
      error: null,
    });
    schedule(1900, {
      jobId: params.jobId,
      status: 'completed',
      percent: 100,
      speed: null,
      eta: null,
      outputPath: `${outDir}/Preview Video (${id}) [${id}].${ext}`,
      error: null,
    });

    previewJobTimers.set(params.jobId, timers);
    return;
  }

  await invoke<void>('start_download', {
    jobId: params.jobId,
    url: params.url,
    format: params.format,
    resolution: params.resolution,
    embedThumbnail: params.embedThumbnail,
    outputDir: params.outputDir,
    clipStart: params.clipStart,
    clipEnd: params.clipEnd,
    embedSubs: params.embedSubs,
  });
}

export async function cancelDownload(jobId: string): Promise<void> {
  if (!isTauri()) {
    const timers = previewJobTimers.get(jobId);
    if (timers) {
      timers.forEach((t) => window.clearTimeout(t));
      previewJobTimers.delete(jobId);
    }
    const payload: ProgressPayload = {
      jobId,
      status: 'cancelled',
      percent: 0,
      speed: null,
      eta: null,
      outputPath: null,
      error: null,
    };
    previewProgressListeners.forEach((cb) => cb(payload));
    return;
  }
  await invoke<void>('cancel_download', { jobId });
}

export async function checkAppUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      currentVersion: '2.0.0',
      latestVersion: '2.0.0',
      updateAvailable: false,
      releaseUrl: 'https://github.com/Supawish35/YoutubeDownloader/releases',
      downloadUrl: null,
      releaseNotes: null,
    };
  }
  return invoke<UpdateCheckResult>('check_app_update');
}

export async function pickOutputDirectory(currentDir?: string): Promise<string | null> {
  if (!isTauri()) {
    const selected = window.prompt('Enter output folder path (browser preview):', currentDir ?? '~/Downloads');
    return selected && selected.trim() ? selected.trim() : null;
  }
  const result = await openDialog({
    directory: true,
    multiple: false,
    defaultPath: currentDir,
  });
  return typeof result === 'string' ? result : null;
}

export async function openOutputDirectory(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await openPath(path);
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await openUrl(url);
}

export async function onDownloadProgress(
  handler: (payload: ProgressPayload) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    previewProgressListeners.add(handler);
    return () => {
      previewProgressListeners.delete(handler);
    };
  }
  return listen<ProgressPayload>('download-progress', (event) => {
    handler(event.payload);
  });
}

export async function onBinaryStatus(
  handler: (payload: BinaryStatus) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    previewBinaryListeners.add(handler);
    return () => {
      previewBinaryListeners.delete(handler);
    };
  }
  return listen<BinaryStatus>('binary-status', (event) => {
    handler(event.payload);
  });
}
