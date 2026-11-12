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
import type { MediaFormat } from '~types/downloader';

export interface ControlPanelProps {
  selectedFormat: MediaFormat;
  onFormatChange: (format: MediaFormat) => void;
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

const FORMAT_OPTIONS: { value: MediaFormat; label: string; isVideo?: boolean }[] = [
  { value: 'mp3', label: '.MP3' },
  { value: 'ogg', label: '.OGG' },
  { value: 'aac', label: '.AAC' },
  { value: 'flac', label: '.FLAC' },
  { value: 'wav', label: '.WAV' },
  { value: 'mp4', label: '.MP4', isVideo: true },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedFormat,
  onFormatChange,
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
        setValidationError('Please paste a YouTube URL first.');
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
        setValidationError('Please paste a YouTube URL first.');
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
      void handleDownloadSingle();
    }
  };

  const inputBorderClass =
    validationState === 'invalid'
      ? 'border-[#DC2626] focus-within:ring-2 focus-within:ring-[#DC2626]/30'
      : validationState === 'valid'
        ? 'border-[#10B981]/60 focus-within:ring-2 focus-within:ring-[#10B981]/30'
        : 'border-[#CBD5E1] focus-within:border-[#EC4899] focus-within:ring-2 focus-within:ring-[#EC4899]/25 dark:border-white/[0.12] dark:focus-within:border-[#EC4899]';

  return (
    <section
      aria-label="Download controls"
      className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm transition-colors duration-200 dark:border-white/[0.08] dark:bg-[#1E293B] sm:p-5"
    >
      {/* URL Ingestion Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          className={`flex h-12 flex-1 items-center gap-2 rounded-xl border bg-[#F8FAFC] px-3.5 transition-all duration-150 dark:bg-[#0F172A] ${inputBorderClass}`}
        >
          <Link2
            className={`h-4 w-4 shrink-0 ${
              validationState === 'valid'
                ? 'text-[#10B981]'
                : validationState === 'invalid'
                  ? 'text-[#DC2626]'
                  : 'text-[#94A3B8]'
            }`}
            strokeWidth={1.75}
          />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a YouTube video, Shorts, or Music URL..."
            aria-label="YouTube URL"
            aria-invalid={validationState === 'invalid'}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-[#94A3B8] focus:outline-none dark:text-slate-100"
          />

          {validationState === 'valid' && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]"
              title="Valid YouTube URL"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          )}

          {urlInput && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear URL"
              aria-label="Clear URL"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors duration-150 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handlePaste()}
            title="Paste URL from clipboard"
            aria-label="Paste URL from clipboard"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 cursor-pointer dark:border-white/[0.08] dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-700/70"
          >
            <ClipboardPaste className="h-3.5 w-3.5 text-[#94A3B8]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Paste</span>
          </button>
        </div>

        {/* Action CTAs */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleDownloadSingle()}
            disabled={isSubmitting || !binaryReady}
            title={
              binaryReady
                ? 'Validate, add to queue, and start download immediately'
                : 'Install yt-dlp first to start downloads'
            }
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#EC4899] px-5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#DB2777] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer lg:flex-initial"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            <span>Download Single</span>
          </button>

          <button
            type="button"
            onClick={() => void handleAddToQueue()}
            disabled={isSubmitting}
            title="Add URL to queue without starting immediately"
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-transparent px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-[#0F172A]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>Add to Queue</span>
          </button>
        </div>
      </div>

      {/* Inline Validation Message */}
      {validationState === 'invalid' && validationError && (
        <div
          role="alert"
          className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#DC2626]"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Format Pills + Embed Thumbnail Toggle */}
      <div className="mt-4 flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            Format
          </span>
          {FORMAT_OPTIONS.map((opt) => {
            const isActive = selectedFormat === opt.value;
            const activeClass = opt.isVideo
              ? 'bg-[#2563EB] text-white border-transparent shadow-sm'
              : 'bg-[#EC4899] text-white border-transparent shadow-sm';
            const inactiveClass =
              'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-slate-900 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-slate-800';

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFormatChange(opt.value)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {opt.isVideo ? (
                  <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <Music className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Embed Thumbnail Toggle Switch */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={embedThumbnail}
            onClick={() => onEmbedThumbnailChange(!embedThumbnail)}
            className="group inline-flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer dark:hover:bg-[#0F172A]"
            title="Embed video thumbnail as cover art (--embed-thumbnail --convert-thumbnails jpg)"
          >
            <ImageIcon
              className={`h-4 w-4 transition-colors ${
                embedThumbnail ? 'text-[#EC4899]' : 'text-[#94A3B8]'
              }`}
              strokeWidth={1.75}
            />
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
              Embed Thumbnail
            </span>
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                embedThumbnail
                  ? 'bg-[#EC4899]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  embedThumbnail ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Output Directory Bar */}
      <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-white/[0.08] dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-xs font-medium text-[#94A3B8]">
            Save to:
          </span>
          <span
            className="font-mono-tabular truncate text-xs font-medium text-slate-700 dark:text-slate-200"
            title={outputDir}
          >
            {outputDir || 'Default Downloads folder'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onChangeOutputDir}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 cursor-pointer dark:border-white/[0.08] dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-700/70"
          >
            <FolderSearch className="h-3.5 w-3.5 text-[#2563EB]" strokeWidth={1.75} />
            <span>Change Folder</span>
          </button>

          <button
            type="button"
            onClick={onOpenOutputDir}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 cursor-pointer dark:border-white/[0.08] dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-700/70"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#94A3B8]" strokeWidth={1.75} />
            <span>Open Folder</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ControlPanel;
