import type {
  AudioFormat,
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
