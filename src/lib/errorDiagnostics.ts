export interface ErrorDiagnosis {
  summary: string;
  raw: string;
  action?: 'openCookiesSettings' | 'updateYtDlp';
  actionLabel?: string;
}

const AUTH_ERROR_RE =
  /sign in|confirm your age|age-restricted|private video|members-only|cookies|login required/i;
const EXTRACTOR_ERROR_RE =
  /http error 403|forbidden|unable to extract|nsig|signature|unsupported url|extractor/i;
const FFMPEG_ERROR_RE = /ffmpeg|ffprobe|postprocessing/i;

export function diagnoseDownloadError(
  error: string | null | undefined
): ErrorDiagnosis | null {
  if (!error || !error.trim()) {
    return null;
  }

  if (AUTH_ERROR_RE.test(error)) {
    return {
      summary:
        'Authentication or age verification required — enable browser cookies in Settings.',
      raw: error,
      action: 'openCookiesSettings',
      actionLabel: 'Use Cookies',
    };
  }

  if (EXTRACTOR_ERROR_RE.test(error)) {
    return {
      summary: 'Extractor blocked or outdated — update yt-dlp to the latest release.',
      raw: error,
      action: 'updateYtDlp',
      actionLabel: 'Update yt-dlp',
    };
  }

  if (FFMPEG_ERROR_RE.test(error)) {
    return {
      summary: 'ffmpeg is required for audio conversion or stream merging.',
      raw: error,
    };
  }

  const cleaned = error
    .split(/\r?\n/)
    .map((line) => line.replace(/^(?:ERROR:\s*)+/i, '').trim())
    .find((line) => line.length > 0);

  return {
    summary: cleaned || error.trim(),
    raw: error,
  };
}
