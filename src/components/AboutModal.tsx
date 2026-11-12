import React, { useEffect } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  ExternalLink,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import type { BinaryStatus } from '~types/downloader';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  binaryStatus: BinaryStatus | null;
  onOpenExternalUrl: (url: string) => void;
}

const GITHUB_REPO_URL = 'https://github.com/Supawish35/YoutubeDownloader';

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  binaryStatus,
  onOpenExternalUrl,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--accent-text)]">
              <ArrowDownToLine className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-baseline gap-2.5">
                <h2
                  id="about-modal-title"
                  className="text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
                >
                  YoutubeDownloader
                </h2>
                <span className="font-mono-tabular text-xs font-medium text-[var(--text-muted)]">
                  v2.0.0
                </span>
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)]">
                Desktop audio &amp; video extractor powered by Tauri, Rust, and yt-dlp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close about dialog"
            title="Close (Esc)"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Spec Grid */}
        <div className="grid grid-cols-2 divide-x divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[0.8125rem]">
          <div className="px-6 py-3.5">
            <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Author
            </span>
            <span className="mt-1 block font-medium text-[var(--text-primary)]">
              Supawish35
            </span>
          </div>
          <div className="px-6 py-3.5">
            <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              License
            </span>
            <span className="font-mono-tabular mt-1 block font-medium text-[var(--text-primary)]">
              GPL-3.0
            </span>
          </div>
        </div>

        <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-3.5 text-[0.8125rem]">
          <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Repository
          </span>
          <button
            type="button"
            onClick={() => onOpenExternalUrl(GITHUB_REPO_URL)}
            className="font-mono-tabular mt-1 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--accent-text)] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <span>{GITHUB_REPO_URL}</span>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Runtime Diagnostics */}
        <div className="px-6 py-4">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Terminal className="h-4 w-4 text-[var(--accent-text)]" strokeWidth={1.75} />
            <span>Runtime Binaries</span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)] rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[0.8125rem]">
            {/* yt-dlp */}
            <div className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  {binaryStatus?.ytDlpPath ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--status-ok)]" strokeWidth={1.75} />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--status-err)]" strokeWidth={1.75} />
                  )}
                  <span className="font-mono-tabular">yt-dlp</span>
                  <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)]">
                    {binaryStatus?.ytDlpSource ?? 'unknown'}
                  </span>
                </div>
                <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                  {binaryStatus?.ytDlpVersion ?? 'Not installed'}
                </span>
              </div>
              <p
                className="font-mono-tabular truncate text-xs text-[var(--text-muted)]"
                title={binaryStatus?.ytDlpPath ?? undefined}
              >
                {binaryStatus?.ytDlpPath ?? 'No binary path detected'}
              </p>
            </div>

            {/* ffmpeg */}
            <div className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  {binaryStatus?.ffmpegAvailable ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--status-ok)]" strokeWidth={1.75} />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--status-warn)]" strokeWidth={1.75} />
                  )}
                  <span className="font-mono-tabular">ffmpeg</span>
                </div>
                <span className="font-mono-tabular max-w-[16rem] truncate text-xs text-[var(--text-secondary)]">
                  {binaryStatus?.ffmpegVersion ?? 'Not found on PATH'}
                </span>
              </div>
              <p
                className="font-mono-tabular truncate text-xs text-[var(--text-muted)]"
                title={binaryStatus?.ffmpegPath ?? undefined}
              >
                {binaryStatus?.ffmpegPath ?? 'Install ffmpeg to enable audio conversion & muxing'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-[0.8125rem] font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
