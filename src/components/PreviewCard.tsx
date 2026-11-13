import React, { useEffect, useState } from 'react';
import { ListVideo, Loader2, Music, Video } from 'lucide-react';
import { formatDuration } from '@/lib/timeUtils';
import type { MediaType, VideoMetadata } from '~types/downloader';

export interface PreviewCardProps {
  meta: VideoMetadata | null;
  loading: boolean;
  showThumbnails?: boolean;
  mode: MediaType;
  formatBadge: string;
  resolutionBadge?: string;
  embedThumbnail?: boolean;
  isPlaylistUrl?: boolean;
  onInspectPlaylist?: () => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  meta,
  loading,
  showThumbnails = true,
  mode,
  formatBadge,
  resolutionBadge,
  embedThumbnail = false,
  isPlaylistUrl = false,
  onInspectPlaylist,
}) => {
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [meta?.thumbnailUrl]);

  if (!loading && !meta) {
    return null;
  }

  if (loading && !meta) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3.5 py-2.5"
      >
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-[var(--accent-text)]"
          strokeWidth={1.75}
        />
        <span className="text-xs text-[var(--text-muted)]">Fetching media preview...</span>
      </div>
    );
  }

  if (!meta) return null;

  const durationText = formatDuration(meta.durationSecs);
  const targetSpec =
    mode === 'video'
      ? `${formatBadge}${resolutionBadge ? ` · ${resolutionBadge}` : ''}`
      : `${formatBadge}${embedThumbnail ? ' · ART' : ''}`;

  return (
    <div
      aria-label="Media preview"
      className="mt-3 flex items-center justify-between gap-3.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3.5 py-2.5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showThumbnails !== false && (
          <div className="relative h-11 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)]">
            {meta.thumbnailUrl && !thumbFailed ? (
              <img
                src={meta.thumbnailUrl}
                alt={meta.title}
                onError={() => setThumbFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                {mode === 'video' ? (
                  <Video className="h-4 w-4 opacity-70" strokeWidth={1.5} />
                ) : (
                  <Music className="h-4 w-4 opacity-70" strokeWidth={1.5} />
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

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm"
            title={meta.title}
          >
            {meta.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            {meta.channel && <span className="truncate">{meta.channel}</span>}
            {meta.source && (
              <span className="font-mono-tabular shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-px text-[0.625rem] font-medium uppercase text-[var(--text-secondary)]">
                {meta.source}
              </span>
            )}
            {showThumbnails === false && durationText && (
              <span className="font-mono-tabular shrink-0 text-[0.6875rem] text-[var(--text-secondary)]">
                {durationText}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPlaylistUrl && onInspectPlaylist && (
          <button
            type="button"
            onClick={onInspectPlaylist}
            aria-label="Inspect playlist"
            title="Open playlist inspector"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2.5 text-xs font-medium text-[var(--accent-text)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <ListVideo className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>Inspect Playlist</span>
          </button>
        )}

        <span className="font-mono-tabular hidden shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2 py-1 text-[0.6875rem] font-medium text-[var(--accent-text)] sm:inline-flex">
          {mode === 'video' ? (
            <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <Music className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          <span>{targetSpec}</span>
        </span>
      </div>
    </div>
  );
};

export default PreviewCard;
