import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpCircle,
  Info,
  Loader2,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { UpdateCheckResult } from '~types/downloader';

export interface HeaderProps {
  isCheckingUpdate: boolean;
  updateInfo: UpdateCheckResult | null;
  onCheckUpdate: () => void;
  onOpenReleaseUrl: (url: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  hasBinaryWarning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isCheckingUpdate,
  updateInfo,
  onCheckUpdate,
  onOpenReleaseUrl,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenAbout,
  hasBinaryWarning = false,
}) => {
  return (
    <header className="shrink-0 border-b border-[var(--border-hairline)] bg-[var(--bg-panel)]">
      <div className="flex h-13 items-center justify-between gap-3 px-5 sm:px-6">
        {/* Wordmark */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--accent-text)]">
            <ArrowDownToLine className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="truncate text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
              YoutubeDownloader
            </h1>
            <span className="font-mono-tabular text-xs font-medium text-[var(--text-muted)]">
              v2.0.0
            </span>
          </div>
        </div>

        {/* Minimal Utility Controls */}
        <div className="flex shrink-0 items-center gap-2">
          {updateInfo?.updateAvailable ? (
            <button
              type="button"
              onClick={() => onOpenReleaseUrl(updateInfo.releaseUrl)}
              title={`Update available: v${updateInfo.latestVersion} — open release`}
              aria-label={`Update available: v${updateInfo.latestVersion}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-3 text-xs font-medium text-[var(--accent-text)] transition-colors duration-150 hover:border-[var(--accent)]/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <ArrowUpCircle className="h-4 w-4" strokeWidth={1.75} />
              <span className="font-mono-tabular">v{updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              title="Check for application updates"
              aria-label="Check for application updates"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              {isCheckingUpdate ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-text)]" strokeWidth={1.75} />
              ) : (
                <ArrowUpCircle className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.5} />
              )}
              <span className="hidden sm:inline">
                {isCheckingUpdate ? 'Checking' : 'Updates'}
              </span>
            </button>
          )}

          <span
            className="mx-0.5 h-5 w-px bg-[var(--border-hairline)]"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            {darkMode ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Appearance & Settings (Ctrl+,)"
            aria-label="Appearance & Settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={onOpenAbout}
            title="About & Runtime Diagnostics"
            aria-label="About & Runtime Diagnostics"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <Info className="h-4 w-4" strokeWidth={1.5} />
            {hasBinaryWarning && (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--status-warn)] ring-2 ring-[var(--bg-panel)]"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
