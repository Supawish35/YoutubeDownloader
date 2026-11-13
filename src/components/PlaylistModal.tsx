import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Image as ImageIcon,
  ListVideo,
  Loader2,
  Music,
  Plus,
  Search,
  Video,
  X,
} from 'lucide-react';
import PrecisionSelect from '~components/PrecisionSelect';
import {
  AUDIO_FORMAT_OPTIONS,
  getFormatOption,
  getResolutionOption,
  supportsCoverArt,
  VIDEO_FORMAT_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from '@/lib/mediaFormats';
import { formatDuration } from '@/lib/timeUtils';
import type {
  AudioFormat,
  MediaFormat,
  MediaType,
  PlaylistEntry,
  PlaylistMetadata,
  VideoFormat,
  VideoResolution,
} from '~types/downloader';

export interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistMetadata | null;
  loading: boolean;
  error: string | null;
  mode: MediaType;
  onModeChange: (mode: MediaType) => void;
  selectedVideoFormat: VideoFormat;
  selectedAudioFormat: AudioFormat;
  onFormatChange: (format: MediaFormat) => void;
  selectedResolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  embedThumbnail: boolean;
  onEmbedThumbnailChange: (enabled: boolean) => void;
  formatBadge: string;
  onConfirm: (entries: PlaylistEntry[], startImmediately: boolean, modeOverride?: MediaType) => void;
}

function getEntryKey(entry: PlaylistEntry, index: number): string {
  return entry.id ? `${entry.id}::${index}` : `${entry.url}::${index}`;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlist,
  loading,
  error,
  mode,
  onModeChange,
  selectedVideoFormat,
  selectedAudioFormat,
  onFormatChange,
  selectedResolution,
  onResolutionChange,
  embedThumbnail,
  onEmbedThumbnailChange,
  formatBadge,
  onConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setFailedThumbs(new Set());
    if (playlist?.entries) {
      setSelectedKeys(new Set(playlist.entries.map((entry, index) => getEntryKey(entry, index))));
    } else {
      setSelectedKeys(new Set());
    }
  }, [isOpen, playlist]);

  const indexedEntries = useMemo(
    () =>
      (playlist?.entries ?? []).map((entry, index) => ({
        entry,
        index,
        key: getEntryKey(entry, index),
      })),
    [playlist]
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return indexedEntries;
    return indexedEntries.filter(
      ({ entry }) =>
        entry.title.toLowerCase().includes(query) ||
        entry.channel.toLowerCase().includes(query)
    );
  }, [indexedEntries, searchQuery]);

  const selectedEntries = useMemo(
    () => indexedEntries.filter((item) => selectedKeys.has(item.key)).map((item) => item.entry),
    [indexedEntries, selectedKeys]
  );

  if (!isOpen) return null;

  const totalCount = indexedEntries.length;
  const selectedCount = selectedEntries.length;
  const coverArtSupported = supportsCoverArt(selectedAudioFormat);
  const resBadge = getResolutionOption(selectedResolution).badge;
  const activeSpecBadge =
    mode === 'video'
      ? `${getFormatOption(selectedVideoFormat).badge} · ${resBadge}`
      : formatBadge;
  const modeLabel = mode === 'video' ? 'Video' : 'Audio';

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of filteredEntries) {
        next.add(item.key);
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of filteredEntries) {
        next.delete(item.key);
      }
      return next;
    });
  };

  const markThumbFailed = (key: string) => {
    setFailedThumbs((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--accent-text)]">
              <ListVideo className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="playlist-modal-title"
                  className="truncate text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
                >
                  {playlist?.title || 'Playlist Inspector'}
                </h2>
                <span className="font-mono-tabular inline-flex w-[6.5rem] shrink-0 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--accent-text)]">
                  {mode === 'video' ? (
                    <Video className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <Music className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{activeSpecBadge}</span>
                </span>
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)]">
                Choose Video or Audio format and select tracks to queue or download.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close playlist inspector"
            title="Close (Esc)"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Format & Mode Switcher Bar (Always Accessible, Fixed-Width Slots) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-2.5">
          <div
            role="radiogroup"
            aria-label="Playlist download mode"
            className="inline-flex h-9 shrink-0 items-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-0.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'video'}
              onClick={() => onModeChange('video')}
              className={`inline-flex h-full w-[5rem] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                mode === 'video'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Video className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>Video</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'audio'}
              onClick={() => onModeChange('audio')}
              className={`inline-flex h-full w-[5rem] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                mode === 'audio'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Music className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>Audio</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'video' ? (
              <>
                <PrecisionSelect<VideoFormat>
                  value={selectedVideoFormat}
                  options={VIDEO_FORMAT_OPTIONS}
                  onChange={(fmt) => onFormatChange(fmt)}
                  prefix="Video"
                  ariaLabel="Playlist video extension"
                  triggerClassName="w-[7.75rem]"
                  menuClassName="min-w-[16rem]"
                  align="right"
                />
                <PrecisionSelect<VideoResolution>
                  value={selectedResolution}
                  options={VIDEO_RESOLUTION_OPTIONS}
                  onChange={onResolutionChange}
                  prefix="Res"
                  ariaLabel="Playlist video resolution"
                  triggerClassName="w-[8.5rem]"
                  menuClassName="min-w-[15rem]"
                  align="right"
                />
              </>
            ) : (
              <>
                <PrecisionSelect<AudioFormat>
                  value={selectedAudioFormat}
                  options={AUDIO_FORMAT_OPTIONS}
                  onChange={(fmt) => onFormatChange(fmt)}
                  prefix="Audio"
                  ariaLabel="Playlist audio extension"
                  triggerClassName="w-[7.75rem]"
                  menuClassName="min-w-[16rem]"
                  align="right"
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={coverArtSupported ? embedThumbnail : false}
                  aria-disabled={!coverArtSupported}
                  disabled={!coverArtSupported}
                  onClick={() => onEmbedThumbnailChange(!embedThumbnail)}
                  title={
                    coverArtSupported
                      ? 'Embed cover art on downloaded audio tracks'
                      : 'WAV container does not support embedded cover art'
                  }
                  className={`inline-flex h-9 w-[8.5rem] items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
                    coverArtSupported
                      ? 'text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer'
                      : 'text-[var(--text-muted)] opacity-45 cursor-not-allowed'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ImageIcon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        coverArtSupported && embedThumbnail
                          ? 'text-[var(--accent-text)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                      strokeWidth={1.5}
                    />
                    <span>Art</span>
                  </span>
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150 ${
                      coverArtSupported && embedThumbnail
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--border-strong)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full transition-transform duration-150 ${
                        coverArtSupported && embedThumbnail
                          ? 'translate-x-[0.875rem] bg-[var(--accent-fg)]'
                          : 'translate-x-[0.125rem] bg-white'
                      }`}
                    />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Batch Selection Toolbar */}
        {!loading && !error && playlist && totalCount > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-2.5">
            <div className="flex h-8 min-w-[12rem] flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2.5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-subtle)]">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title or channel..."
                aria-label="Filter playlist entries"
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear filter"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2 py-1 text-[0.6875rem] font-medium text-[var(--accent-text)]">
                {selectedCount} / {totalCount} selected
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={filteredEntries.length === 0}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={filteredEntries.length === 0}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <Loader2
                className="h-6 w-6 animate-spin text-[var(--accent-text)]"
                strokeWidth={1.75}
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Inspecting playlist entries...
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Fetching track titles and durations from source.
              </p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 px-6 py-8">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-err)]"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--status-err)]">
                  Failed to load playlist
                </p>
                <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">{error}</p>
              </div>
            </div>
          ) : !playlist || totalCount === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-[var(--text-muted)]">
              No playable entries found in this playlist.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-[var(--text-muted)]">
              No entries match &ldquo;{searchQuery.trim()}&rdquo;.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-hairline)]">
              {filteredEntries.map(({ entry, index, key }) => {
                const checked = selectedKeys.has(key);
                const durationText = formatDuration(entry.durationSecs);
                const thumbFailed = failedThumbs.has(key);

                return (
                  <li key={key}>
                    <div
                      className={`group flex items-center gap-3 px-6 py-2.5 transition-colors duration-150 ${
                        checked
                          ? 'bg-[var(--accent-subtle)]/40 hover:bg-[var(--accent-subtle)]/60'
                          : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(key)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
                            checked
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                              : 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>

                        <span className="font-mono-tabular w-6 shrink-0 text-right text-[0.6875rem] text-[var(--text-muted)]">
                          {index + 1}
                        </span>

                        <div className="relative h-9 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)]">
                          {entry.thumbnailUrl && !thumbFailed ? (
                            <img
                              src={entry.thumbnailUrl}
                              alt=""
                              loading="lazy"
                              onError={() => markThumbFailed(key)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                              {mode === 'video' ? (
                                <Video className="h-3.5 w-3.5 opacity-70" strokeWidth={1.5} />
                              ) : (
                                <Music className="h-3.5 w-3.5 opacity-70" strokeWidth={1.5} />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium text-[var(--text-primary)]"
                            title={entry.title}
                          >
                            {entry.title}
                          </p>
                          <p className="truncate text-xs text-[var(--text-secondary)]">
                            {entry.channel || 'Unknown channel'}
                          </p>
                        </div>

                        {durationText && (
                          <span className="font-mono-tabular shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-secondary)]">
                            {durationText}
                          </span>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => onConfirm([entry], true, mode)}
                        title={`Download "${entry.title}" as ${modeLabel} (${activeSpecBadge})`}
                        aria-label={`Download ${entry.title} as ${modeLabel}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading || selectedCount === 0}
              onClick={() => onConfirm(selectedEntries, false, mode)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={1.75} />
              <span>
                Queue {selectedCount} {modeLabel}
              </span>
            </button>

            <button
              type="button"
              disabled={loading || selectedCount === 0}
              onClick={() => onConfirm(selectedEntries, true, mode)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-xs font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>
                Download {selectedCount} {modeLabel}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
