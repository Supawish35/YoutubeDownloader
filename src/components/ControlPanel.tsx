import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ClipboardPaste,
  FolderOpen,
  FolderSearch,
  Image as ImageIcon,
  Link2,
  Music,
  Plus,
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
import { detectMediaSource } from '@/lib/mediaSources';
import type {
  AudioFormat,
  MediaFormat,
  MediaType,
  VideoFormat,
  VideoResolution,
} from '~types/downloader';

export interface ControlPanelProps {
  defaultType: MediaType;
  selectedAudioFormat: AudioFormat;
  selectedVideoFormat: VideoFormat;
  onFormatChange: (format: MediaFormat) => void;
  selectedResolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  embedThumbnail: boolean;
  onEmbedThumbnailChange: (enabled: boolean) => void;
  outputDir: string;
  onChangeOutputDir: () => void;
  onOpenOutputDir: () => void;
  onDownloadMedia: (url: string, mediaType: MediaType) => Promise<boolean>;
  onAddToQueue: (url: string, mediaType: MediaType) => Promise<boolean>;
  validateUrlFn: (url: string) => Promise<string>;
  binaryReady: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  defaultType,
  selectedAudioFormat,
  selectedVideoFormat,
  onFormatChange,
  selectedResolution,
  onResolutionChange,
  embedThumbnail,
  onEmbedThumbnailChange,
  outputDir,
  onChangeOutputDir,
  onOpenOutputDir,
  onDownloadMedia,
  onAddToQueue,
  validateUrlFn,
  binaryReady,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueMenuOpen, setQueueMenuOpen] = useState(false);

  const queueMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!queueMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (queueMenuRef.current && !queueMenuRef.current.contains(event.target as Node)) {
        setQueueMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setQueueMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [queueMenuOpen]);

  const runValidation = async (raw: string): Promise<boolean> => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setValidationState('idle');
      setValidationError(null);
      return false;
    }
    try {
      await validateUrlFn(trimmed);
      setValidationState('valid');
      setValidationError(null);
      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Please enter a valid media URL';
      setValidationState('invalid');
      setValidationError(message || 'Please enter a valid media URL');
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    if (!value.trim()) {
      setValidationState('idle');
      setValidationError(null);
      return;
    }
    void runValidation(value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        void runValidation(text);
      }
    } catch {
      setValidationError('Clipboard access unavailable. Paste with Ctrl+V.');
      setValidationState('invalid');
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setValidationState('idle');
    setValidationError(null);
  };

  const submitUrl = async (mediaType: MediaType, startImmediately: boolean) => {
    if (isSubmitting) return;
    setQueueMenuOpen(false);

    const isValid = await runValidation(urlInput);
    if (!isValid) {
      if (!urlInput.trim()) {
        setValidationState('invalid');
        setValidationError('Paste a media URL first.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmed = urlInput.trim();
      const ok = startImmediately
        ? await onDownloadMedia(trimmed, mediaType)
        : await onAddToQueue(trimmed, mediaType);
      if (ok) {
        handleClear();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submitUrl(defaultType, !e.shiftKey);
    }
  };

  const inputBorderClass =
    validationState === 'invalid'
      ? 'border-[var(--status-err)] focus-within:ring-1 focus-within:ring-[var(--status-err)]'
      : validationState === 'valid'
        ? 'border-[var(--status-ok)]/70 focus-within:ring-1 focus-within:ring-[var(--status-ok)]'
        : 'border-[var(--border-hairline)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-subtle)]';

  const detectedSource =
    validationState === 'valid' && urlInput.trim() ? detectMediaSource(urlInput) : null;
  const videoBadge = getFormatOption(selectedVideoFormat).badge;
  const resBadge = getResolutionOption(selectedResolution).badge;
  const audioBadge = getFormatOption(selectedAudioFormat).badge;
  const coverArtSupported = supportsCoverArt(selectedAudioFormat);
  const coverArtTitle = !coverArtSupported
    ? 'WAV container does not support embedded cover art'
    : 'Embed thumbnail as cover art for Audio downloads (--embed-thumbnail)';

  return (
    <section
      aria-label="Download controls"
      className="shrink-0 border-b border-[var(--border-hairline)] bg-[var(--bg-panel)] px-5 py-4 sm:px-6"
    >
      {/* Row 1: URL Intake + Dual Video/Audio Download CTAs + Queue Picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`flex h-11 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border bg-[var(--bg-inset)] px-3.5 transition-colors duration-150 ${inputBorderClass}`}
        >
          <Link2
            className={`h-4 w-4 shrink-0 ${
              validationState === 'valid'
                ? 'text-[var(--status-ok)]'
                : validationState === 'invalid'
                  ? 'text-[var(--status-err)]'
                  : 'text-[var(--text-muted)]'
            }`}
            strokeWidth={1.5}
          />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube, TikTok, Facebook, X, Instagram, or media URL..."
            aria-label="Media URL"
            aria-invalid={validationState === 'invalid'}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />

          {validationState === 'valid' && detectedSource && (
            <span
              className="font-mono-tabular inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--status-ok)]/35 bg-[var(--status-ok)]/10 px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase text-[var(--status-ok)]"
              title={`Valid ${detectedSource} URL`}
            >
              <Check className="h-3 w-3" strokeWidth={2.25} />
              <span>{detectedSource}</span>
            </span>
          )}

          {urlInput && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear URL"
              aria-label="Clear URL"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handlePaste()}
            title="Paste URL from clipboard"
            aria-label="Paste URL from clipboard"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <ClipboardPaste className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
            <span>Paste</span>
          </button>
        </div>

        {/* Action CTAs: Equal Video & Audio Download Buttons + Queue Picker */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void submitUrl('video', true)}
            disabled={isSubmitting || !binaryReady}
            title={
              binaryReady
                ? `Download Video immediately (${videoBadge} · ${resBadge})`
                : 'Install yt-dlp first to start downloads'
            }
            aria-label="Download Video"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:flex-initial"
          >
            <Video className="h-4 w-4" strokeWidth={1.75} />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => void submitUrl('audio', true)}
            disabled={isSubmitting || !binaryReady}
            title={
              binaryReady
                ? `Download Audio immediately (${audioBadge})`
                : 'Install yt-dlp first to start downloads'
            }
            aria-label="Download Audio"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:flex-initial"
          >
            <Music className="h-4 w-4" strokeWidth={1.75} />
            <span>Audio</span>
          </button>

          {/* Compact Queue Mode Picker */}
          <div ref={queueMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setQueueMenuOpen((prev) => !prev)}
              disabled={isSubmitting}
              aria-haspopup="menu"
              aria-expanded={queueMenuOpen}
              aria-label="Add to queue as Video or Audio"
              title="Add URL to queue as Video or Audio (Shift+Enter uses default)"
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border bg-transparent px-3.5 text-sm font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                queueMenuOpen
                  ? 'border-[var(--accent)] bg-[var(--bg-hover)]'
                  : 'border-[var(--border-hairline)]'
              }`}
            >
              <Plus className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
              <span>Queue</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150 ${
                  queueMenuOpen ? 'rotate-180 text-[var(--accent-text)]' : ''
                }`}
                strokeWidth={1.75}
              />
            </button>

            {queueMenuOpen && (
              <div
                role="menu"
                aria-label="Queue media type"
                className="absolute right-0 top-[calc(100%+0.375rem)] z-40 min-w-[14.5rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void submitUrl('video', false)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-xs text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Video className="h-3.5 w-3.5 text-[var(--accent-text)]" strokeWidth={1.75} />
                    <span>Queue Video</span>
                  </span>
                  <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-secondary)]">
                    {videoBadge} · {resBadge}
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void submitUrl('audio', false)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-xs text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Music className="h-3.5 w-3.5 text-[var(--accent-text)]" strokeWidth={1.75} />
                    <span>Queue Audio</span>
                  </span>
                  <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-secondary)]">
                    {audioBadge}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Validation Error */}
      {validationState === 'invalid' && validationError && (
        <div
          role="alert"
          className="mt-2.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--status-err)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Row 2: Side-by-Side Video & Audio Format Controls + Cover Art + Output Folder */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Video Extension & Max Resolution */}
          <PrecisionSelect<VideoFormat>
            value={selectedVideoFormat}
            options={VIDEO_FORMAT_OPTIONS}
            onChange={(fmt) => onFormatChange(fmt)}
            prefix="Video"
            ariaLabel="Video file extension"
            menuClassName="min-w-[16rem]"
          />

          <PrecisionSelect<VideoResolution>
            value={selectedResolution}
            options={VIDEO_RESOLUTION_OPTIONS}
            onChange={onResolutionChange}
            prefix="Res"
            ariaLabel="Video maximum resolution"
            menuClassName="min-w-[15rem]"
          />

          <span
            className="mx-0.5 hidden h-5 w-px bg-[var(--border-hairline)] sm:inline-block"
            aria-hidden="true"
          />

          {/* Audio Extension & Cover Art Switch */}
          <PrecisionSelect<AudioFormat>
            value={selectedAudioFormat}
            options={AUDIO_FORMAT_OPTIONS}
            onChange={(fmt) => onFormatChange(fmt)}
            prefix="Audio"
            ariaLabel="Audio file extension"
            menuClassName="min-w-[16rem]"
          />

          <button
            type="button"
            role="switch"
            aria-checked={coverArtSupported ? embedThumbnail : false}
            aria-disabled={!coverArtSupported}
            disabled={!coverArtSupported}
            onClick={() => onEmbedThumbnailChange(!embedThumbnail)}
            title={coverArtTitle}
            className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
              coverArtSupported
                ? 'text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer'
                : 'text-[var(--text-muted)] opacity-45 cursor-not-allowed'
            }`}
          >
            <ImageIcon
              className={`h-4 w-4 transition-colors ${
                coverArtSupported && embedThumbnail
                  ? 'text-[var(--accent-text)]'
                  : 'text-[var(--text-muted)]'
              }`}
              strokeWidth={1.5}
            />
            <span>Cover Art</span>
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
        </div>

        {/* Inline Output Folder Strip */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] md:inline">
            Dest
          </span>
          <button
            type="button"
            onClick={onChangeOutputDir}
            title={`Output directory: ${outputDir || 'Default Downloads folder'} — click to change`}
            className="inline-flex h-9 max-w-[16rem] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3 text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer sm:max-w-[20rem]"
          >
            <FolderSearch className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} />
            <span className="font-mono-tabular truncate">
              {outputDir || 'Default Downloads'}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenOutputDir}
            title="Open output folder"
            aria-label="Open output folder"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ControlPanel;
