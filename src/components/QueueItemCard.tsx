import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FolderOpen,
  KeyRound,
  Loader2,
  Music,
  Play,
  RotateCcw,
  Scissors,
  Square,
  Subtitles,
  Trash2,
  Video,
  Wrench,
} from 'lucide-react';
import { diagnoseDownloadError } from '@/lib/errorDiagnostics';
import { getFormatOption, isVideoFormat, supportsCoverArt } from '@/lib/mediaFormats';
import { detectMediaSource } from '@/lib/mediaSources';
import type { QueueItem } from '~types/downloader';

export interface QueueItemCardProps {
  item: QueueItem;
  showThumbnails?: boolean;
  onStart: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onOpenFolder: (item: QueueItem) => void;
  onOpenFile?: (item: QueueItem) => void;
  onOpenCookiesSettings?: () => void;
  onUpdateYtDlp?: () => void;
  onRemove: (jobId: string) => void;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  showThumbnails = true,
  onStart,
  onCancel,
  onRetry,
  onOpenFolder,
  onOpenFile,
  onOpenCookiesSettings,
  onUpdateYtDlp,
  onRemove,
}) => {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedUrl(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedUrl(false);
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      // Ignore clipboard write errors in restricted environments
    }
  };

  const isVideo = isVideoFormat(item.format);
  const formatBadge = getFormatOption(item.format).badge;
  const showCoverArtBadge = item.embedThumbnail && supportsCoverArt(item.format);
  const hasClipRange = Boolean(item.clipStart || item.clipEnd);
  const showSubsBadge = Boolean(item.embedSubs);
  const isActive =
    item.status === 'fetchingMeta' ||
    item.status === 'downloading' ||
    item.status === 'converting';

  const diagnosis = item.status === 'failed' ? diagnoseDownloadError(item.error) : null;

  const durationText = formatDuration(item.metadata?.durationSecs ?? null);
  const sourceLabel = item.metadata?.source || detectMediaSource(item.url);
  const titleText = item.metadata?.title || item.url;
  const channelText =
    item.metadata?.channel ||
    (item.status === 'fetchingMeta' ? 'Resolving media details...' : `${sourceLabel} Media`);

  const clampedPercent = Math.min(100, Math.max(0, item.percent));

  const renderStatusLabel = () => {
    switch (item.status) {
      case 'queued':
        return (
          <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
            QUEUED
          </span>
        );
      case 'fetchingMeta':
        return (
          <span className="font-mono-tabular inline-flex items-center gap-1 text-xs text-[var(--status-warn)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            <span>META</span>
          </span>
        );
      case 'downloading':
        return (
          <span className="font-mono-tabular inline-flex items-center justify-end gap-1 text-xs font-medium text-[var(--accent-text)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            <span>DL</span>
          </span>
        );
      case 'converting':
        return (
          <span className="font-mono-tabular inline-flex items-center gap-1 text-xs text-[var(--status-warn)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            <span>MUX</span>
          </span>
        );
      case 'completed':
        return (
          <span className="font-mono-tabular text-xs font-medium text-[var(--status-ok)]">
            DONE
          </span>
        );
      case 'failed':
        return (
          <span className="font-mono-tabular text-xs font-medium text-[var(--status-err)]">
            ERR
          </span>
        );
      case 'cancelled':
        return (
          <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
            STOPPED
          </span>
        );
    }
  };

  const renderProgressFill = () => {
    if (item.status === 'completed') {
      return (
        <div
          className="h-full bg-[var(--status-ok)] transition-all duration-200"
          style={{ width: '100%' }}
        />
      );
    }
    if (item.status === 'failed') {
      return (
        <div
          className="h-full bg-[var(--status-err)] transition-all duration-200"
          style={{ width: `${Math.max(clampedPercent, 100)}%` }}
        />
      );
    }
    if (item.status === 'fetchingMeta' || item.status === 'converting') {
      return (
        <div
          className="h-full animate-pulse bg-[var(--status-warn)] transition-all duration-200"
          style={{ width: item.status === 'converting' ? '100%' : '35%' }}
        />
      );
    }
    if (item.status === 'downloading') {
      return (
        <div
          className="h-full bg-[var(--accent)] transition-all duration-150"
          style={{ width: `${clampedPercent}%` }}
        />
      );
    }
    return <div className="h-full bg-transparent" style={{ width: '0%' }} />;
  };

  const secondaryDetail =
    item.status === 'failed'
      ? diagnosis?.summary ?? item.error ?? 'Download failed'
      : item.status === 'completed' && item.outputPath
        ? item.outputPath
        : channelText;

  const secondaryTitle =
    item.status === 'failed' && item.error ? item.error : secondaryDetail;

  return (
    <article className="group flex items-center gap-4 bg-[var(--bg-canvas)] px-5 py-[var(--row-py)] transition-colors duration-150 hover:bg-[var(--bg-hover)] sm:px-6">
      {/* Compact 16:9 Thumbnail */}
      {showThumbnails && (
        <div className="relative h-[var(--thumb-h)] w-[var(--thumb-w)] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)]">
          {item.metadata?.thumbnailUrl && !thumbFailed ? (
            <img
              src={item.metadata.thumbnailUrl}
              alt={titleText}
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              {isVideo ? (
                <Video className="h-5 w-5 opacity-70" strokeWidth={1.5} />
              ) : (
                <Music className="h-5 w-5 opacity-70" strokeWidth={1.5} />
              )}
            </div>
          )}

          {durationText && (
            <span className="font-mono-tabular absolute right-1 bottom-1 rounded-[0.125rem] bg-black/80 px-1 py-px text-[0.625rem] font-medium text-white">
              {durationText}
            </span>
          )}
        </div>
      )}

      {/* Metadata + Progress Track + Telemetry */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Line 1: Title + Format/Art Tags + Status */}
        <div className="flex items-center justify-between gap-2.5">
          <h3
            className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]"
            title={titleText}
          >
            {titleText}
          </h3>

          <div className="flex shrink-0 items-center gap-1.5">
            {!showThumbnails && durationText && (
              <span className="font-mono-tabular hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)] sm:inline">
                {durationText}
              </span>
            )}
            <span
              title={`Source: ${sourceLabel}`}
              className="font-mono-tabular hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase text-[var(--text-secondary)] sm:inline"
            >
              {sourceLabel}
            </span>
            <span className="font-mono-tabular inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-secondary)]">
              {isVideo ? (
                <Video className="h-3 w-3 text-[var(--accent-text)]" strokeWidth={1.75} />
              ) : (
                <Music className="h-3 w-3 text-[var(--accent-text)]" strokeWidth={1.75} />
              )}
              <span>
                {formatBadge}
                {isVideo && item.resolution ? ` · ${item.resolution.toUpperCase()}` : ''}
              </span>
            </span>
            {showCoverArtBadge && (
              <span
                title="Cover art embedded"
                className="font-mono-tabular hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)] sm:inline"
              >
                ART
              </span>
            )}
            {hasClipRange && (
              <span
                title={`${item.clipStart || '0:00'} - ${item.clipEnd || 'end'}`}
                className="font-mono-tabular hidden items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)] sm:inline-flex"
              >
                <Scissors className="h-3 w-3 text-[var(--accent-text)]" strokeWidth={1.75} />
                <span>CLIP</span>
              </span>
            )}
            {showSubsBadge && (
              <span
                title="Subtitles embedded"
                className="font-mono-tabular hidden items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)] sm:inline-flex"
              >
                <Subtitles className="h-3 w-3 text-[var(--accent-text)]" strokeWidth={1.75} />
                <span>SUBS</span>
              </span>
            )}
            <span className="inline-flex w-[4rem] justify-end">
              {renderStatusLabel()}
            </span>
          </div>
        </div>

        {/* Line 2: Progress Track */}
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-inset)]"
          role="progressbar"
          aria-valuenow={Math.round(clampedPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {renderProgressFill()}
        </div>

        {/* Line 3: Subtitle/Path/Error + Fixed-Width Tabular Telemetry */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p
              className={`min-w-0 truncate ${
                item.status === 'failed' && item.error
                  ? 'font-medium text-[var(--status-err)]'
                  : item.status === 'completed' && item.outputPath
                    ? 'font-mono-tabular text-[var(--text-muted)]'
                    : 'text-[var(--text-muted)]'
              }`}
              title={secondaryTitle}
            >
              {secondaryDetail}
            </p>
            {item.status === 'failed' &&
              diagnosis?.action === 'openCookiesSettings' &&
              onOpenCookiesSettings && (
                <button
                  type="button"
                  onClick={onOpenCookiesSettings}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--accent-text)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <KeyRound className="h-3 w-3" strokeWidth={1.75} />
                  <span>{diagnosis.actionLabel ?? 'Use Cookies'}</span>
                </button>
              )}
            {item.status === 'failed' &&
              diagnosis?.action === 'updateYtDlp' &&
              onUpdateYtDlp && (
                <button
                  type="button"
                  onClick={onUpdateYtDlp}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--accent-text)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <Wrench className="h-3 w-3" strokeWidth={1.75} />
                  <span>{diagnosis.actionLabel ?? 'Update yt-dlp'}</span>
                </button>
              )}
          </div>

          <div className="font-mono-tabular flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
            <span
              className={`${
                item.speed ? 'inline-block' : 'hidden sm:inline-block'
              } w-[5.25rem] truncate text-right`}
            >
              {item.speed ?? ''}
            </span>
            <span
              className={`${
                item.eta ? 'inline-block' : 'hidden sm:inline-block'
              } w-[5rem] truncate text-right`}
            >
              {item.eta ? `ETA ${item.eta}` : ''}
            </span>
            <span className="w-[3.25rem] text-right font-medium text-[var(--text-secondary)]">
              {clampedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Compact Row Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {item.status === 'queued' && (
          <button
            type="button"
            onClick={() => onStart(item.jobId)}
            aria-label="Start download"
            title="Start download"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <Play className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {isActive && (
          <button
            type="button"
            onClick={() => onCancel(item.jobId)}
            aria-label="Cancel download"
            title="Cancel download"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--status-err)]/35 bg-[var(--status-err)]/10 text-[var(--status-err)] transition-colors duration-150 hover:bg-[var(--status-err)]/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-current" strokeWidth={1.75} />
          </button>
        )}

        {(item.status === 'failed' || item.status === 'cancelled') && (
          <button
            type="button"
            onClick={() => onRetry(item.jobId)}
            aria-label="Retry download"
            title="Retry download"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        {item.status === 'completed' && item.outputPath && onOpenFile && (
          <button
            type="button"
            onClick={() => onOpenFile(item)}
            aria-label="Open media file"
            title="Open media file"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}

        {item.status === 'completed' && (
          <button
            type="button"
            onClick={() => onOpenFolder(item)}
            aria-label="Open output folder"
            title="Open output folder"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--status-ok)]/35 bg-[var(--status-ok)]/10 text-[var(--status-ok)] transition-colors duration-150 hover:bg-[var(--status-ok)]/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <FolderOpen className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleCopyUrl()}
          aria-label={copiedUrl ? 'Copied URL' : 'Copy URL'}
          title={copiedUrl ? 'Copied URL' : 'Copy URL'}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-transparent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
            copiedUrl
              ? 'text-[var(--status-ok)] bg-[var(--status-ok)]/10'
              : 'text-[var(--text-muted)] hover:border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {copiedUrl ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>

        <button
          type="button"
          onClick={() => onRemove(item.jobId)}
          aria-label="Remove from queue"
          title="Remove from queue"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--status-err)]/30 hover:bg-[var(--status-err)]/10 hover:text-[var(--status-err)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </article>
  );
};

export default QueueItemCard;
