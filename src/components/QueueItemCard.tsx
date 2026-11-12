import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Music,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Video,
} from 'lucide-react';
import type { QueueItem } from '~types/downloader';

export interface QueueItemCardProps {
  item: QueueItem;
  onStart: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onOpenFolder: (item: QueueItem) => void;
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
  onStart,
  onCancel,
  onRetry,
  onOpenFolder,
  onRemove,
}) => {
  const [thumbFailed, setThumbFailed] = useState(false);

  const isVideo = item.format === 'mp4';
  const isActive =
    item.status === 'fetchingMeta' ||
    item.status === 'downloading' ||
    item.status === 'converting';

  const durationText = formatDuration(item.metadata?.durationSecs ?? null);
  const titleText = item.metadata?.title || item.url;
  const channelText =
    item.metadata?.channel ||
    (item.status === 'fetchingMeta' ? 'Fetching video details...' : 'YouTube Media');

  const clampedPercent = Math.min(100, Math.max(0, item.percent));

  const renderStatusBadge = () => {
    switch (item.status) {
      case 'queued':
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-[#94A3B8]">
            Queued
          </span>
        );
      case 'fetchingMeta':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B]">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            <span>Fetching info</span>
          </span>
        );
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/15 px-2 py-0.5 text-[11px] font-medium text-[#2563EB] dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            <span>Downloading</span>
          </span>
        );
      case 'converting':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B]">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            <span>Converting</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-medium text-[#10B981]">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#DC2626]/15 px-2 py-0.5 text-[11px] font-medium text-[#DC2626]">
            <AlertCircle className="h-3 w-3" strokeWidth={2} />
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-[#94A3B8] dark:bg-slate-800">
            Cancelled
          </span>
        );
    }
  };

  const renderProgressFill = () => {
    if (item.status === 'completed') {
      return (
        <div
          className="h-full rounded-full bg-[#10B981] transition-all duration-300"
          style={{ width: '100%' }}
        />
      );
    }
    if (item.status === 'failed') {
      return (
        <div
          className="h-full rounded-full bg-[#DC2626] transition-all duration-300"
          style={{ width: `${Math.max(clampedPercent, 100)}%` }}
        />
      );
    }
    if (item.status === 'fetchingMeta' || item.status === 'converting') {
      return (
        <div
          className="h-full animate-pulse rounded-full bg-[#F59E0B] transition-all duration-300"
          style={{ width: item.status === 'converting' ? '100%' : '35%' }}
        />
      );
    }
    if (item.status === 'downloading') {
      return (
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#DB2777] to-[#2563EB] transition-all duration-200"
          style={{ width: `${clampedPercent}%` }}
        />
      );
    }
    return (
      <div
        className="h-full rounded-full bg-slate-300 dark:bg-slate-700"
        style={{ width: '0%' }}
      />
    );
  };

  return (
    <article className="group rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 shadow-sm transition-all duration-150 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#1E293B] dark:hover:border-white/[0.16] sm:p-4">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
        {/* Thumbnail Preview */}
        <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] dark:border-white/[0.08] dark:bg-[#0F172A] sm:w-32">
          {item.metadata?.thumbnailUrl && !thumbFailed ? (
            <img
              src={item.metadata.thumbnailUrl}
              alt={titleText}
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
              {isVideo ? (
                <Video className="h-6 w-6 opacity-70" strokeWidth={1.5} />
              ) : (
                <Music className="h-6 w-6 opacity-70" strokeWidth={1.5} />
              )}
            </div>
          )}

          {durationText && (
            <span className="font-mono-tabular absolute right-1.5 bottom-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {durationText}
            </span>
          )}
        </div>

        {/* Details & Live Progress */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white"
                title={titleText}
              >
                {titleText}
              </h3>
              <p className="mt-0.5 truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                {channelText}
              </p>
            </div>

            {/* Format, Cover Art & Status Badges */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isVideo
                    ? 'bg-[#2563EB]/15 text-[#2563EB] dark:text-blue-400'
                    : 'bg-[#EC4899]/15 text-[#EC4899]'
                }`}
              >
                {isVideo ? (
                  <Video className="h-3 w-3" strokeWidth={2} />
                ) : (
                  <Music className="h-3 w-3" strokeWidth={2} />
                )}
                <span>.{item.format.toUpperCase()}</span>
              </span>

              {item.embedThumbnail && (
                <span
                  title="Cover thumbnail embedded"
                  className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/[0.08] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                >
                  <ImageIcon className="h-3 w-3 text-[#EC4899]" strokeWidth={1.75} />
                  <span>Art</span>
                </span>
              )}

              {renderStatusBadge()}
            </div>
          </div>

          {/* Horizontal Progress Bar */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-[#0F172A]"
            role="progressbar"
            aria-valuenow={Math.round(clampedPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {renderProgressFill()}
          </div>

          {/* Bottom Metrics / Output / Error Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1">
              {item.status === 'failed' && item.error ? (
                <p
                  className="truncate font-medium text-[#DC2626]"
                  title={item.error}
                >
                  {item.error}
                </p>
              ) : item.status === 'completed' && item.outputPath ? (
                <p
                  className="font-mono-tabular truncate text-[11px] text-[#64748B] dark:text-[#94A3B8]"
                  title={item.outputPath}
                >
                  {item.outputPath}
                </p>
              ) : (
                <span className="text-[11px] text-[#94A3B8]">
                  {item.status === 'queued'
                    ? 'Waiting to start'
                    : item.status === 'fetchingMeta'
                      ? 'Resolving media streams...'
                      : item.status === 'converting'
                        ? 'Processing audio/video with ffmpeg...'
                        : item.status === 'cancelled'
                          ? 'Download cancelled'
                          : 'Downloading stream...'}
                </span>
              )}
            </div>

            <div className="font-mono-tabular flex shrink-0 items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
              {item.speed && <span>{item.speed}</span>}
              {item.eta && <span>ETA {item.eta}</span>}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {clampedPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-[#E2E8F0] pt-2.5 dark:border-white/[0.08] sm:border-t-0 sm:pt-0">
          {item.status === 'queued' && (
            <button
              type="button"
              onClick={() => onStart(item.jobId)}
              aria-label="Start download"
              title="Start download"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EC4899] text-white transition-colors duration-150 hover:bg-[#DB2777] cursor-pointer"
            >
              <Play className="h-4 w-4" strokeWidth={2} />
            </button>
          )}

          {isActive && (
            <button
              type="button"
              onClick={() => onCancel(item.jobId)}
              aria-label="Cancel download"
              title="Cancel download"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626] transition-colors duration-150 hover:bg-[#DC2626]/20 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2} />
            </button>
          )}

          {(item.status === 'failed' || item.status === 'cancelled') && (
            <button
              type="button"
              onClick={() => onRetry(item.jobId)}
              aria-label="Retry download"
              title="Retry download"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] transition-colors duration-150 hover:bg-[#2563EB]/20 cursor-pointer dark:text-blue-400"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} />
            </button>
          )}

          {item.status === 'completed' && (
            <button
              type="button"
              onClick={() => onOpenFolder(item)}
              aria-label="Open output folder"
              title="Open output folder"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] transition-colors duration-150 hover:bg-[#10B981]/20 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemove(item.jobId)}
            aria-label="Remove from queue"
            title="Remove from queue"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-transparent text-[#94A3B8] transition-colors duration-150 hover:border-[#DC2626]/30 hover:bg-[#DC2626]/10 hover:text-[#DC2626] cursor-pointer dark:border-white/[0.08]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default QueueItemCard;
