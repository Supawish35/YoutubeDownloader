import React from 'react';
import {
  ArrowUpCircle,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { BinaryStatus, UpdateCheckResult } from '~types/downloader';

export interface HeaderProps {
  binaryStatus: BinaryStatus | null;
  isProvisioningBinaries: boolean;
  onProvisionOrUpdateBinaries: () => void;
  isCheckingUpdate: boolean;
  updateInfo: UpdateCheckResult | null;
  onCheckUpdate: () => void;
  onOpenReleaseUrl: (url: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  binaryStatus,
  isProvisioningBinaries,
  onProvisionOrUpdateBinaries,
  isCheckingUpdate,
  updateInfo,
  onCheckUpdate,
  onOpenReleaseUrl,
  darkMode,
  onToggleDarkMode,
  onOpenAbout,
}) => {
  const ytDlpPresent = Boolean(binaryStatus?.ytDlpPath);
  const ffmpegAvailable = Boolean(binaryStatus?.ffmpegAvailable);
  const allReady = Boolean(binaryStatus?.ready);

  const renderBinaryPill = () => {
    if (isProvisioningBinaries) {
      return (
        <div className="flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          <span>Provisioning binaries...</span>
        </div>
      );
    }

    if (allReady && binaryStatus) {
      return (
        <div className="flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5 text-xs font-medium text-[#10B981]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="hidden sm:inline">Engine Ready</span>
          <span className="font-mono-tabular text-[11px] opacity-90">
            yt-dlp {binaryStatus.ytDlpVersion ?? 'ok'}
          </span>
          <button
            type="button"
            onClick={onProvisionOrUpdateBinaries}
            title="Update yt-dlp binary"
            aria-label="Update yt-dlp binary"
            className="ml-0.5 inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-medium text-[#10B981] transition-colors duration-150 hover:bg-[#10B981]/25 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2} />
            <span className="hidden md:inline">Update</span>
          </button>
        </div>
      );
    }

    if (ytDlpPresent && !ffmpegAvailable) {
      return (
        <div
          className="flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B]"
          title="yt-dlp is ready, but ffmpeg was not found on PATH. Audio conversion may fail."
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>ffmpeg missing</span>
          <button
            type="button"
            onClick={onProvisionOrUpdateBinaries}
            title="Update yt-dlp binary"
            aria-label="Update yt-dlp binary"
            className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B] transition-colors duration-150 hover:bg-[#F59E0B]/25 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-full border border-[#DC2626]/30 bg-[#DC2626]/10 px-3 py-1.5 text-xs font-medium text-[#DC2626]">
        <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span>yt-dlp missing</span>
        <button
          type="button"
          onClick={onProvisionOrUpdateBinaries}
          title="Install yt-dlp binary"
          aria-label="Install yt-dlp binary"
          className="inline-flex items-center gap-1 rounded-full bg-[#DC2626] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#B91C1C] cursor-pointer"
        >
          <Download className="h-3 w-3" strokeWidth={2} />
          <span>Install</span>
        </button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-[#FFFFFF]/90 backdrop-blur-md transition-colors duration-200 dark:border-white/[0.08] dark:bg-[#0F172A]/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm">
            <Download className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white sm:text-lg">
              YoutubeDownloader
            </h1>
            <span className="font-mono-tabular rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-medium text-[#64748B] dark:border-white/[0.08] dark:bg-[#1E293B] dark:text-[#94A3B8]">
              v2.0.0
            </span>
          </div>
        </div>

        {/* Status & Utility Actions */}
        <div className="flex items-center gap-2">
          {renderBinaryPill()}

          {updateInfo?.updateAvailable ? (
            <button
              type="button"
              onClick={() => onOpenReleaseUrl(updateInfo.releaseUrl)}
              title={`Update available: v${updateInfo.latestVersion} — click to open release page`}
              aria-label={`Update available: v${updateInfo.latestVersion}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 text-xs font-medium text-[#2563EB] transition-colors duration-150 hover:bg-[#2563EB]/20 cursor-pointer dark:text-blue-400"
            >
              <ArrowUpCircle className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">v{updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              title="Check for application updates"
              aria-label="Check for application updates"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-transparent px-2.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-[#F8FAFC] disabled:opacity-50 cursor-pointer dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-[#1E293B]"
            >
              {isCheckingUpdate ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" strokeWidth={2} />
              ) : (
                <ArrowUpCircle className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.75} />
              )}
              <span className="hidden md:inline">
                {isCheckingUpdate ? 'Checking...' : 'Updates'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-transparent text-slate-700 transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-[#1E293B]"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" strokeWidth={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAbout}
            title="About YoutubeDownloader"
            aria-label="About YoutubeDownloader"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-transparent text-slate-700 transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-[#1E293B]"
          >
            <Info className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
