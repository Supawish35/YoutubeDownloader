import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Download,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-xl transition-all duration-200 dark:border-white/[0.08] dark:bg-[#1E293B] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm">
              <Download className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="about-modal-title"
                  className="text-lg font-semibold tracking-[-0.02em] text-slate-900 dark:text-white"
                >
                  YoutubeDownloader
                </h2>
                <span className="font-mono-tabular rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-medium text-[#64748B] dark:border-white/[0.08] dark:bg-[#0F172A] dark:text-[#94A3B8]">
                  v2.0.0
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                High-performance desktop audio &amp; video extractor powered by Tauri, Rust, and yt-dlp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close about dialog"
            title="Close (Esc)"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-transparent text-[#94A3B8] transition-colors duration-150 hover:bg-[#F8FAFC] hover:text-slate-900 cursor-pointer dark:border-white/[0.08] dark:hover:bg-[#0F172A] dark:hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs dark:border-white/[0.08] dark:bg-[#0F172A]">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Author
            </span>
            <span className="mt-1 block font-medium text-slate-900 dark:text-slate-100">
              Supawish35
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              License
            </span>
            <span className="font-mono-tabular mt-1 block font-medium text-slate-900 dark:text-slate-100">
              GPL-3.0
            </span>
          </div>
          <div className="col-span-2 border-t border-[#E2E8F0] pt-2.5 dark:border-white/[0.08]">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Repository
            </span>
            <button
              type="button"
              onClick={() => onOpenExternalUrl(GITHUB_REPO_URL)}
              className="mt-1 inline-flex items-center gap-1.5 font-medium text-[#2563EB] transition-colors hover:underline cursor-pointer dark:text-blue-400"
            >
              <span>{GITHUB_REPO_URL}</span>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Binary Diagnostics */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Terminal className="h-3.5 w-3.5 text-[#EC4899]" strokeWidth={2} />
            <span>Runtime Binaries</span>
          </div>

          <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs dark:border-white/[0.08] dark:bg-[#0F172A]">
            {/* yt-dlp */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                  {binaryStatus?.ytDlpPath ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={2} />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[#DC2626]" strokeWidth={2} />
                  )}
                  <span>yt-dlp</span>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-[#94A3B8]">
                    {binaryStatus?.ytDlpSource ?? 'unknown'}
                  </span>
                </div>
                <span className="font-mono-tabular text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {binaryStatus?.ytDlpVersion ?? 'Not installed'}
                </span>
              </div>
              <p
                className="font-mono-tabular truncate text-[11px] text-[#94A3B8]"
                title={binaryStatus?.ytDlpPath ?? undefined}
              >
                {binaryStatus?.ytDlpPath ?? 'No binary path detected'}
              </p>
            </div>

            {/* ffmpeg */}
            <div className="space-y-1 border-t border-[#E2E8F0] pt-2.5 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                  {binaryStatus?.ffmpegAvailable ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={2} />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[#F59E0B]" strokeWidth={2} />
                  )}
                  <span>ffmpeg</span>
                </div>
                <span className="font-mono-tabular max-w-[240px] truncate text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {binaryStatus?.ffmpegVersion ?? 'Not found on PATH'}
                </span>
              </div>
              <p
                className="font-mono-tabular truncate text-[11px] text-[#94A3B8]"
                title={binaryStatus?.ffmpegPath ?? undefined}
              >
                {binaryStatus?.ffmpegPath ?? 'Install ffmpeg to enable audio conversion & muxing'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#EC4899] px-4 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#DB2777] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
