import type {
  AudioFormat,
  FilenameTemplate,
  MediaFormat,
  MediaType,
  VideoFormat,
  VideoResolution,
} from '~types/downloader';

export interface FormatOption<T extends string = string> {
  value: T;
  label: string;
  badge: string;
  hint: string;
}

export const AUDIO_FORMAT_OPTIONS: FormatOption<AudioFormat>[] = [
  { value: 'mp3', label: 'MP3', badge: '.MP3', hint: 'Universal lossy audio' },
  { value: 'ogg', label: 'OGG', badge: '.OGG', hint: 'Vorbis open container' },
  { value: 'aac', label: 'AAC', badge: '.M4A', hint: 'High-efficiency AAC' },
  { value: 'flac', label: 'FLAC', badge: '.FLAC', hint: 'Lossless studio audio' },
  { value: 'wav', label: 'WAV', badge: '.WAV', hint: 'Uncompressed PCM' },
];

export const VIDEO_FORMAT_OPTIONS: FormatOption<VideoFormat>[] = [
  { value: 'mp4', label: 'MP4', badge: '.MP4', hint: 'H.264 / AAC compatible' },
  { value: 'mkv', label: 'MKV', badge: '.MKV', hint: 'Flexible Matroska container' },
  { value: 'webm', label: 'WEBM', badge: '.WEBM', hint: 'VP9 / Opus open video' },
];

export const VIDEO_RESOLUTION_OPTIONS: FormatOption<VideoResolution>[] = [
  { value: 'best', label: 'Best', badge: 'BEST', hint: 'Highest source quality' },
  { value: '1080p', label: '1080p', badge: '1080P', hint: 'Full HD maximum' },
  { value: '720p', label: '720p', badge: '720P', hint: 'HD balanced' },
  { value: '480p', label: '480p', badge: '480P', hint: 'SD compact size' },
];

export const FILENAME_TEMPLATE_OPTIONS: FormatOption<FilenameTemplate>[] = [
  { value: 'titleId', label: 'Title [ID]', badge: 'TITLE [ID]', hint: 'Title [id].ext' },
  { value: 'titleOnly', label: 'Title Only', badge: 'TITLE', hint: 'Title.ext' },
  { value: 'channelTitle', label: 'Channel - Title', badge: 'CH - TITLE', hint: 'Channel - Title.ext' },
];

export type PresetId =
  | 'custom'
  | 'video-best'
  | 'video-1080p'
  | 'video-720p'
  | 'audio-mp3'
  | 'audio-flac';

export interface QuickPreset {
  id: Exclude<PresetId, 'custom'>;
  label: string;
  badge: string;
  hint: string;
  mode: MediaType;
  videoFormat?: VideoFormat;
  resolution?: VideoResolution;
  audioFormat?: AudioFormat;
  embedThumbnail?: boolean;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'video-best',
    label: 'Best Video',
    badge: 'BEST MP4',
    hint: 'Highest quality MP4',
    mode: 'video',
    videoFormat: 'mp4',
    resolution: 'best',
  },
  {
    id: 'video-1080p',
    label: '1080p MP4',
    badge: '1080P',
    hint: 'Full HD MP4 video',
    mode: 'video',
    videoFormat: 'mp4',
    resolution: '1080p',
  },
  {
    id: 'video-720p',
    label: '720p MP4',
    badge: '720P',
    hint: 'Balanced HD MP4',
    mode: 'video',
    videoFormat: 'mp4',
    resolution: '720p',
  },
  {
    id: 'audio-mp3',
    label: 'MP3 + Cover',
    badge: 'MP3',
    hint: 'MP3 with embedded cover art',
    mode: 'audio',
    audioFormat: 'mp3',
    embedThumbnail: true,
  },
  {
    id: 'audio-flac',
    label: 'Lossless FLAC',
    badge: 'FLAC',
    hint: 'FLAC with embedded cover art',
    mode: 'audio',
    audioFormat: 'flac',
    embedThumbnail: true,
  },
];

export const PRESET_OPTIONS: FormatOption<PresetId>[] = [
  { value: 'custom', label: 'Custom', badge: 'CUSTOM', hint: 'Manual format settings' },
  ...QUICK_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.label,
    badge: preset.badge,
    hint: preset.hint,
  })),
];

export function resolveActivePresetId(
  mode: MediaType,
  videoFormat: VideoFormat,
  resolution: VideoResolution,
  audioFormat: AudioFormat,
  embedThumbnail: boolean
): PresetId {
  const matched = QUICK_PRESETS.find((preset) => {
    if (preset.mode !== mode) return false;
    if (preset.embedThumbnail !== undefined && preset.embedThumbnail !== embedThumbnail) {
      return false;
    }
    if (mode === 'video') {
      return preset.videoFormat === videoFormat && preset.resolution === resolution;
    }
    return preset.audioFormat === audioFormat;
  });

  return matched?.id ?? 'custom';
}

const AUDIO_FORMAT_SET = new Set<string>(AUDIO_FORMAT_OPTIONS.map((o) => o.value));
const VIDEO_FORMAT_SET = new Set<string>(VIDEO_FORMAT_OPTIONS.map((o) => o.value));
const COVER_ART_SUPPORTED_SET = new Set<string>(['mp3', 'ogg', 'aac', 'flac']);

export function isAudioFormat(format: MediaFormat): format is AudioFormat {
  return AUDIO_FORMAT_SET.has(format);
}

export function isVideoFormat(format: MediaFormat): format is VideoFormat {
  return VIDEO_FORMAT_SET.has(format);
}

export function getMediaTypeForFormat(format: MediaFormat): MediaType {
  return isVideoFormat(format) ? 'video' : 'audio';
}

export function supportsCoverArt(format: MediaFormat): boolean {
  return COVER_ART_SUPPORTED_SET.has(format);
}

export function getFormatOption(format: MediaFormat): FormatOption<MediaFormat> {
  return (
    AUDIO_FORMAT_OPTIONS.find((o) => o.value === format) ??
    VIDEO_FORMAT_OPTIONS.find((o) => o.value === format) ??
    AUDIO_FORMAT_OPTIONS[0]
  );
}

export function getResolutionOption(
  resolution: VideoResolution = 'best'
): FormatOption<VideoResolution> {
  return (
    VIDEO_RESOLUTION_OPTIONS.find((o) => o.value === resolution) ??
    VIDEO_RESOLUTION_OPTIONS[0]
  );
}
