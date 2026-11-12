import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Download,
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
  supportsCoverArt,
  VIDEO_FORMAT_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from '@/lib/mediaFormats';
import type {
  AudioFormat,
  MediaFormat,
  MediaType,
  VideoFormat,
  VideoResolution,
} from '~types/downloader';

export interface ControlPanelProps {
  selectedType: MediaType;
  onTypeChange: (type: MediaType) => void;
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
  onDownloadSingle: (url: string) => Promise<boolean>;
  onAddToQueue: (url: string) => Promise<boolean>;
  validateUrlFn: (url: string) => Promise<string>;
  binaryReady: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedType,
  onTypeChange,
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
  onDownloadSingle,
  onAddToQueue,
  validateUrlFn,
  binaryReady,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            : 'Please enter a valid YouTube URL';
      setValidationState('invalid');
      setValidationError(message);
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

  const handleDownloadSingle = async () => {
    if (isSubmitting) return;
    const isValid = await runValidation(urlInput);
    if (!isValid) {
      if (!urlInput.trim()) {
        setValidationState('invalid');
        setValidationError('Paste a YouTube URL first.');
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onDownloadSingle(urlInput.trim());
      if (ok) {
        handleClear();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToQueue = async () => {
    if (isSubmitting) return;
    const isValid = await runValidation(urlInput);
    if (!isValid) {
      if (!urlInput.trim()) {
        setValidationState('invalid');
        setValidationError('Paste a YouTube URL first.');
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onAddToQueue(urlInput.trim());
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
      if (e.shiftKey) {
        void handleAddToQueue();
      } else {
        void handleDownloadSingle();
      }
    }
  };

  const inputBorderClass =
    validationState === 'invalid'
      ? 'border-[var(--status-err)] focus-within:ring-1 focus-within:ring-[var(--status-err)]'
      : validationState === 'valid'
        ? 'border-[var(--status-ok)]/70 focus-within:ring-1 focus-within:ring-[var(--status-ok)]'
        : 'border-[var(--border-hairline)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-subtle)]';

  const isVideoMode = selectedType === 'video';
  const activeFormat: MediaFormat = isVideoMode ? selectedVideoFormat : selectedAudioFormat;
  const coverArtSupported = !isVideoMode && supportsCoverArt(activeFormat);
  const coverArtTitle = isVideoMode
    ? 'Cover art embedding is skipped in Video mode'
    : !coverArtSupported
      ? 'WAV container does not support embedded cover art'
      : 'Embed video thumbnail as cover art (--embed-thumbnail)';

  const renderTypeButton = (
    type: MediaType,
    label: string,
    Icon: React.FC<{ className?: string; strokeWidth?: number }>
  ) => {
    const isActive = selectedType === type;
    return (
      <button
        key={type}
        type="button"
        role="radio"
        aria-checked={isActive}
        onClick={() => onTypeChange(type)}
        className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
          isActive
            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <section
      aria-label="Download controls"
      className="shrink-0 border-b border-[var(--border-hairline)] bg-[var(--bg-panel)] px-5 py-4 sm:px-6"
    >
      {/* Row 1: URL Intake + Primary Actions */}
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
            placeholder="Paste YouTube video, Shorts, or Music URL (Enter to download)..."
            aria-label="YouTube URL"
            aria-invalid={validationState === 'invalid'}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />

          {validationState === 'valid' && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--status-ok)]"
              title="Valid YouTube URL"
            >
              <Check className="h-4 w-4" strokeWidth={2.25} />
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

        {/* Action CTAs */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadSingle()}
            disabled={isSubmitting || !binaryReady}
            title={
              binaryReady
                ? 'Validate, add to queue, and start download immediately (Enter)'
                : 'Install yt-dlp first to start downloads'
            }
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:flex-initial"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={() => void handleAddToQueue()}
            disabled={isSubmitting}
            title="Add URL to queue without starting immediately (Shift+Enter)"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-4 text-sm font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
            <span>Queue</span>
          </button>
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

      {/* Row 2: Media Type Switch + Extension/Quality Popovers + Cover Art + Output Folder */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audio / Video Type Switch */}
          <div
            role="radiogroup"
            aria-label="Download type"
            className="inline-flex h-9 items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-0.5"
          >
            {renderTypeButton('audio', 'Audio', Music)}
            {renderTypeButton('video', 'Video', Video)}
          </div>

          {/* Contextual Extension Dropdown */}
          {isVideoMode ? (
            <PrecisionSelect<VideoFormat>
              value={selectedVideoFormat}
              options={VIDEO_FORMAT_OPTIONS}
              onChange={(fmt) => onFormatChange(fmt)}
              prefix="Ext"
              ariaLabel="Video file extension"
              menuClassName="min-w-[16rem]"
            />
          ) : (
            <PrecisionSelect<AudioFormat>
              value={selectedAudioFormat}
              options={AUDIO_FORMAT_OPTIONS}
              onChange={(fmt) => onFormatChange(fmt)}
              prefix="Ext"
              ariaLabel="Audio file extension"
              menuClassName="min-w-[16rem]"
            />
          )}

          {/* Video Resolution Dropdown (Video mode only) */}
          {isVideoMode && (
            <PrecisionSelect<VideoResolution>
              value={selectedResolution}
              options={VIDEO_RESOLUTION_OPTIONS}
              onChange={onResolutionChange}
              prefix="Res"
              ariaLabel="Video maximum resolution"
              menuClassName="min-w-[15rem]"
            />
          )}

          {/* Embed Cover Art Switch (enabled for supported Audio formats) */}
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
