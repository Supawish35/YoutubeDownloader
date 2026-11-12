import React, { lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Info,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import { ControlPanel } from '~components/ControlPanel';
import { Header } from '~components/Header';
import { SuspenseLoader } from '~components/SuspenseLoader';
import {
  cancelDownload,
  checkAppUpdate,
  checkBinaries,
  fetchVideoInfo,
  getSettings,
  onBinaryStatus,
  onDownloadProgress,
  openExternalUrl,
  openOutputDirectory,
  pickOutputDirectory,
  provisionBinaries,
  saveSettings,
  startDownload,
  updateYtDlp,
  validateUrl,
} from '@/lib/tauri';
import { isVideoFormat, supportsCoverArt } from '@/lib/mediaFormats';
import type {
  AppSettings,
  BinaryStatus,
  MediaFormat,
  MediaType,
  QueueFilter,
  QueueItem,
  UpdateCheckResult,
  VideoResolution,
} from '~types/downloader';

const QueueList = lazy(() => import('~components/QueueList'));
const AboutModal = lazy(() => import('~components/AboutModal'));
const SettingsModal = lazy(() => import('~components/SettingsModal'));

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  outputDir: '',
  defaultFormat: 'mp3',
  defaultType: 'audio',
  defaultAudioFormat: 'mp3',
  defaultVideoFormat: 'mp4',
  defaultVideoResolution: 'best',
  embedThumbnail: true,
  darkMode: true,
  maxConcurrent: 3,
  themeMode: 'dark',
  accentColor: 'vermilion',
  density: 'comfortable',
  cornerStyle: 'balanced',
  fontScale: 'md',
  showThumbnails: true,
};

function generateJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getParentDirectory(filePath: string): string | null {
  const normalized = filePath.trim();
  if (!normalized) return null;
  const lastSlash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  if (lastSlash <= 0) return null;
  return normalized.slice(0, lastSlash);
}

function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [binaryStatus, setBinaryStatus] = useState<BinaryStatus | null>(null);
  const [isProvisioningBinaries, setIsProvisioningBinaries] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const toastTimerRef = useRef<number | null>(null);
  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;

  const showToast = useCallback(
    (
      type: ToastNotification['type'],
      message: string,
      action?: { label: string; url: string }
    ) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      const next: ToastNotification = {
        id: String(Date.now()),
        type,
        message,
        actionLabel: action?.label,
        actionUrl: action?.url,
      };
      setToast(next);
      toastTimerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === next.id ? null : current));
      }, 6000);
    },
    []
  );

  // Listen for OS color-scheme changes when themeMode === 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateMatch = () => setSystemPrefersDark(media.matches);
    updateMatch();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    }
    media.addListener(updateMatch);
    return () => media.removeListener(updateMatch);
  }, []);

  const effectiveDarkMode =
    settings.themeMode === 'system'
      ? systemPrefersDark
      : settings.themeMode === 'dark';

  // Sync appearance tokens and dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.accent = settings.accentColor;
    root.dataset.density = settings.density;
    root.dataset.corners = settings.cornerStyle;
    root.dataset.scale = settings.fontScale;
  }, [
    effectiveDarkMode,
    settings.accentColor,
    settings.density,
    settings.cornerStyle,
    settings.fontScale,
  ]);

  // Global Ctrl+, / Cmd+, shortcut to toggle Settings modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Initial load: settings, binaries (with auto-provision if yt-dlp missing), and event listeners
  useEffect(() => {
    let active = true;
    let unlistenProgress: (() => void) | undefined;
    let unlistenBinary: (() => void) | undefined;

    const init = async () => {
      try {
        const loadedSettings = await getSettings();
        if (active) {
          setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
          setSettingsLoaded(true);
        }
      } catch (err) {
        if (active) {
          setSettingsLoaded(true);
          showToast('error', formatErrorMessage(err, 'Failed to load settings.'));
        }
      }

      try {
        unlistenProgress = await onDownloadProgress((payload) => {
          if (!active) return;
          setQueue((prev) =>
            prev.map((item) => {
              if (item.jobId !== payload.jobId) return item;
              return {
                ...item,
                status: payload.status,
                percent: payload.percent,
                speed: payload.speed,
                eta: payload.eta,
                outputPath: payload.outputPath ?? item.outputPath,
                error: payload.error,
              };
            })
          );
        });

        unlistenBinary = await onBinaryStatus((status) => {
          if (!active) return;
          setBinaryStatus(status);
        });
      } catch (err) {
        if (active) {
          showToast('error', formatErrorMessage(err, 'Failed to attach event listeners.'));
        }
      }

      try {
        const status = await checkBinaries();
        if (!active) return;
        setBinaryStatus(status);

        if (!status.ytDlpPath) {
          setIsProvisioningBinaries(true);
          showToast('info', 'yt-dlp not found. Downloading latest binary automatically...');
          try {
            const provisioned = await provisionBinaries();
            if (active) {
              setBinaryStatus(provisioned);
              showToast('success', 'yt-dlp installed and ready.');
            }
          } catch (provErr) {
            if (active) {
              showToast(
                'error',
                formatErrorMessage(provErr, 'Failed to auto-provision yt-dlp.')
              );
            }
          } finally {
            if (active) {
              setIsProvisioningBinaries(false);
            }
          }
        }
      } catch (err) {
        if (active) {
          showToast('error', formatErrorMessage(err, 'Failed to check runtime binaries.'));
        }
      }
    };

    void init();

    return () => {
      active = false;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      unlistenProgress?.();
      unlistenBinary?.();
    };
  }, [showToast]);

  const updateAndPersistSettings = useCallback(
    async (updater: (prev: AppSettings) => AppSettings) => {
      const next = updater(settingsRef.current);
      setSettings(next);
      if (!settingsLoaded) return;
      try {
        await saveSettings(next);
      } catch (err) {
        showToast('error', formatErrorMessage(err, 'Failed to save settings.'));
      }
    },
    [settingsLoaded, showToast]
  );

  const handleTypeChange = useCallback(
    (defaultType: MediaType) => {
      void updateAndPersistSettings((prev) => ({
        ...prev,
        defaultType,
        defaultFormat:
          defaultType === 'video' ? prev.defaultVideoFormat : prev.defaultAudioFormat,
      }));
    },
    [updateAndPersistSettings]
  );

  const handleFormatChange = useCallback(
    (format: MediaFormat) => {
      void updateAndPersistSettings((prev) =>
        isVideoFormat(format)
          ? {
              ...prev,
              defaultType: 'video',
              defaultVideoFormat: format,
              defaultFormat: format,
            }
          : {
              ...prev,
              defaultType: 'audio',
              defaultAudioFormat: format,
              defaultFormat: format,
            }
      );
    },
    [updateAndPersistSettings]
  );

  const handleResolutionChange = useCallback(
    (defaultVideoResolution: VideoResolution) => {
      void updateAndPersistSettings((prev) => ({ ...prev, defaultVideoResolution }));
    },
    [updateAndPersistSettings]
  );

  const handleEmbedThumbnailChange = useCallback(
    (embedThumbnail: boolean) => {
      void updateAndPersistSettings((prev) => ({ ...prev, embedThumbnail }));
    },
    [updateAndPersistSettings]
  );

  const handleToggleDarkMode = useCallback(() => {
    void updateAndPersistSettings((prev) => {
      const currentDark =
        prev.themeMode === 'system'
          ? systemPrefersDark
          : prev.themeMode === 'dark';
      const nextDark = !currentDark;
      return {
        ...prev,
        darkMode: nextDark,
        themeMode: nextDark ? 'dark' : 'light',
      };
    });
  }, [systemPrefersDark, updateAndPersistSettings]);

  const handleUpdateSettings = useCallback(
    (updater: (prev: AppSettings) => AppSettings) => {
      void updateAndPersistSettings((prev) => {
        const next = updater(prev);
        if (next.themeMode !== prev.themeMode) {
          const nextDark =
            next.themeMode === 'system'
              ? systemPrefersDark
              : next.themeMode === 'dark';
          return { ...next, darkMode: nextDark };
        }
        return next;
      });
    },
    [systemPrefersDark, updateAndPersistSettings]
  );

  const handleResetAppearanceDefaults = useCallback(() => {
    void updateAndPersistSettings((prev) => ({
      ...prev,
      darkMode: DEFAULT_SETTINGS.darkMode,
      themeMode: DEFAULT_SETTINGS.themeMode,
      accentColor: DEFAULT_SETTINGS.accentColor,
      density: DEFAULT_SETTINGS.density,
      cornerStyle: DEFAULT_SETTINGS.cornerStyle,
      fontScale: DEFAULT_SETTINGS.fontScale,
      showThumbnails: DEFAULT_SETTINGS.showThumbnails,
    }));
    showToast('info', 'Appearance settings reset to defaults.');
  }, [showToast, updateAndPersistSettings]);

  const handleChangeOutputDir = useCallback(async () => {
    try {
      const selected = await pickOutputDirectory(settingsRef.current.outputDir || undefined);
      if (selected) {
        await updateAndPersistSettings((prev) => ({ ...prev, outputDir: selected }));
        showToast('success', `Output folder set to ${selected}`);
      }
    } catch (err) {
      showToast('error', formatErrorMessage(err, 'Failed to select output directory.'));
    }
  }, [showToast, updateAndPersistSettings]);

  const handleOpenOutputDir = useCallback(async () => {
    const dir = settingsRef.current.outputDir;
    if (!dir) {
      showToast('warning', 'No output directory configured yet.');
      return;
    }
    try {
      await openOutputDirectory(dir);
    } catch (err) {
      showToast('error', formatErrorMessage(err, 'Failed to open output folder.'));
    }
  }, [showToast]);

  const handleProvisionOrUpdateBinaries = useCallback(async () => {
    if (isProvisioningBinaries) return;
    setIsProvisioningBinaries(true);
    try {
      const hasYtDlp = Boolean(binaryStatus?.ytDlpPath);
      const nextStatus = hasYtDlp ? await updateYtDlp() : await provisionBinaries();
      setBinaryStatus(nextStatus);
      showToast(
        'success',
        hasYtDlp
          ? `yt-dlp updated (${nextStatus.ytDlpVersion ?? 'latest'})`
          : 'yt-dlp installed successfully.'
      );
    } catch (err) {
      showToast('error', formatErrorMessage(err, 'Failed to install or update yt-dlp.'));
    } finally {
      setIsProvisioningBinaries(false);
    }
  }, [binaryStatus?.ytDlpPath, isProvisioningBinaries, showToast]);

  const handleCheckUpdate = useCallback(async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      const result = await checkAppUpdate();
      setUpdateInfo(result);
      if (result.updateAvailable) {
        showToast(
          'info',
          `YoutubeDownloader v${result.latestVersion} is available!`,
          { label: 'View Release', url: result.releaseUrl }
        );
      } else {
        showToast('success', `You are on the latest version (v${result.currentVersion}).`);
      }
    } catch (err) {
      showToast('error', formatErrorMessage(err, 'Failed to check for updates.'));
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [isCheckingUpdate, showToast]);

  const handleOpenExternalUrl = useCallback(
    async (url: string) => {
      try {
        await openExternalUrl(url);
      } catch (err) {
        showToast('error', formatErrorMessage(err, 'Failed to open external link.'));
      }
    },
    [showToast]
  );

  const enqueueUrl = useCallback(
    async (rawUrl: string, startImmediately: boolean): Promise<boolean> => {
      try {
        const validatedUrl = await validateUrl(rawUrl);
        const currentSettings = settingsRef.current;
        const jobId = generateJobId();
        const activeFormat =
          currentSettings.defaultType === 'video'
            ? currentSettings.defaultVideoFormat
            : currentSettings.defaultAudioFormat;
        const activeResolution =
          currentSettings.defaultType === 'video'
            ? currentSettings.defaultVideoResolution
            : undefined;
        const effectiveEmbedThumbnail =
          currentSettings.embedThumbnail && supportsCoverArt(activeFormat);

        const newItem: QueueItem = {
          jobId,
          url: validatedUrl,
          format: activeFormat,
          resolution: activeResolution,
          embedThumbnail: effectiveEmbedThumbnail,
          status: 'queued',
          percent: 0,
          speed: null,
          eta: null,
          outputPath: null,
          error: null,
          metadata: null,
          addedAt: Date.now(),
        };

        setQueue((prev) => [newItem, ...prev]);

        // Fetch rich video metadata asynchronously
        void fetchVideoInfo(validatedUrl)
          .then((metadata) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.jobId === jobId ? { ...item, metadata } : item
              )
            );
          })
          .catch(() => {
            // Metadata fetch is best-effort; download itself still proceeds
          });

        if (startImmediately) {
          await startDownload({
            jobId,
            url: validatedUrl,
            format: activeFormat,
            resolution: activeResolution,
            embedThumbnail: effectiveEmbedThumbnail,
            outputDir: currentSettings.outputDir || undefined,
          });
        } else {
          showToast('info', 'Added to download queue.');
        }

        return true;
      } catch (err) {
        showToast('error', formatErrorMessage(err, 'Failed to add download.'));
        return false;
      }
    },
    [showToast]
  );

  const handleStartItem = useCallback(
    async (jobId: string) => {
      const target = queue.find((item) => item.jobId === jobId);
      if (!target) return;

      setQueue((prev) =>
        prev.map((item) =>
          item.jobId === jobId
            ? { ...item, status: 'queued', percent: 0, error: null, speed: null, eta: null }
            : item
        )
      );

      try {
        await startDownload({
          jobId: target.jobId,
          url: target.url,
          format: target.format,
          resolution: target.resolution,
          embedThumbnail: target.embedThumbnail,
          outputDir: settingsRef.current.outputDir || undefined,
        });
      } catch (err) {
        const message = formatErrorMessage(err, 'Failed to start download.');
        setQueue((prev) =>
          prev.map((item) =>
            item.jobId === jobId
              ? { ...item, status: 'failed', error: message }
              : item
          )
        );
        showToast('error', message);
      }
    },
    [queue, showToast]
  );

  const handleCancelItem = useCallback(
    async (jobId: string) => {
      try {
        await cancelDownload(jobId);
      } catch (err) {
        showToast('error', formatErrorMessage(err, 'Failed to cancel download.'));
      }
    },
    [showToast]
  );

  const handleRetryItem = useCallback(
    async (jobId: string) => {
      const target = queue.find((item) => item.jobId === jobId);
      if (!target) return;

      if (!target.metadata) {
        void fetchVideoInfo(target.url)
          .then((metadata) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.jobId === jobId ? { ...item, metadata } : item
              )
            );
          })
          .catch(() => {
            // Best-effort metadata refresh
          });
      }

      await handleStartItem(jobId);
    },
    [handleStartItem, queue]
  );

  const handleOpenItemFolder = useCallback(
    async (item: QueueItem) => {
      const folder =
        (item.outputPath ? getParentDirectory(item.outputPath) : null) ??
        settingsRef.current.outputDir;
      if (!folder) {
        showToast('warning', 'Output folder path is unavailable.');
        return;
      }
      try {
        await openOutputDirectory(folder);
      } catch (err) {
        showToast('error', formatErrorMessage(err, 'Failed to open folder.'));
      }
    },
    [showToast]
  );

  const handleRemoveItem = useCallback(
    async (jobId: string) => {
      const target = queue.find((item) => item.jobId === jobId);
      if (
        target &&
        (target.status === 'fetchingMeta' ||
          target.status === 'downloading' ||
          target.status === 'converting')
      ) {
        try {
          await cancelDownload(jobId);
        } catch {
          // Proceed with removing from UI even if job already exited
        }
      }
      setQueue((prev) => prev.filter((item) => item.jobId !== jobId));
    },
    [queue]
  );

  const handleDownloadAllQueued = useCallback(async () => {
    const queuedItems = queue.filter((item) => item.status === 'queued');
    for (const item of queuedItems) {
      await handleStartItem(item.jobId);
    }
  }, [handleStartItem, queue]);

  const handleClearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  }, []);

  const handleClearAll = useCallback(async () => {
    const activeItems = queue.filter(
      (item) =>
        item.status === 'fetchingMeta' ||
        item.status === 'downloading' ||
        item.status === 'converting'
    );
    await Promise.allSettled(activeItems.map((item) => cancelDownload(item.jobId)));
    setQueue([]);
  }, [queue]);

  const ytDlpReady = Boolean(binaryStatus?.ytDlpPath);
  const ffmpegAvailable = Boolean(binaryStatus?.ffmpegAvailable);
  const hasBinaryWarning = Boolean(binaryStatus && (!ytDlpReady || !ffmpegAvailable));
  const activeCount = queue.filter(
    (item) =>
      item.status === 'fetchingMeta' ||
      item.status === 'downloading' ||
      item.status === 'converting'
  ).length;

  return (
    <div className="flex h-screen min-h-[520px] flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header
        isCheckingUpdate={isCheckingUpdate}
        updateInfo={updateInfo}
        onCheckUpdate={() => void handleCheckUpdate()}
        onOpenReleaseUrl={(url) => void handleOpenExternalUrl(url)}
        darkMode={effectiveDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        hasBinaryWarning={hasBinaryWarning}
      />

      {/* Edge-to-Edge Workbench Body */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ControlPanel
          selectedType={settings.defaultType}
          onTypeChange={handleTypeChange}
          selectedAudioFormat={settings.defaultAudioFormat}
          selectedVideoFormat={settings.defaultVideoFormat}
          onFormatChange={handleFormatChange}
          selectedResolution={settings.defaultVideoResolution}
          onResolutionChange={handleResolutionChange}
          embedThumbnail={settings.embedThumbnail}
          onEmbedThumbnailChange={handleEmbedThumbnailChange}
          outputDir={settings.outputDir}
          onChangeOutputDir={() => void handleChangeOutputDir()}
          onOpenOutputDir={() => void handleOpenOutputDir()}
          onDownloadSingle={(url) => enqueueUrl(url, true)}
          onAddToQueue={(url) => enqueueUrl(url, false)}
          validateUrlFn={validateUrl}
          binaryReady={ytDlpReady}
        />

        <SuspenseLoader>
          <QueueList
            items={queue}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onStartItem={(jobId) => void handleStartItem(jobId)}
            onCancelItem={(jobId) => void handleCancelItem(jobId)}
            onRetryItem={(jobId) => void handleRetryItem(jobId)}
            onOpenItemFolder={(item) => void handleOpenItemFolder(item)}
            onRemoveItem={(jobId) => void handleRemoveItem(jobId)}
            onDownloadAllQueued={() => void handleDownloadAllQueued()}
            onClearCompleted={handleClearCompleted}
            onClearAll={() => void handleClearAll()}
            binaryReady={ytDlpReady}
            showThumbnails={settings.showThumbnails}
          />
        </SuspenseLoader>
      </main>

      {/* Unified Bottom Telemetry Bar */}
      <footer className="shrink-0 border-t border-[var(--border-hairline)] bg-[var(--bg-panel)] px-5 py-2 text-xs text-[var(--text-muted)] sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-3.5">
            {/* yt-dlp Status + Update/Install */}
            <div className="inline-flex items-center gap-2">
              {isProvisioningBinaries ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--status-warn)]" strokeWidth={2} />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${
                    ytDlpReady ? 'bg-[var(--status-ok)]' : 'bg-[var(--status-err)]'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className="font-mono-tabular text-[var(--text-secondary)]">
                yt-dlp{' '}
                {isProvisioningBinaries
                  ? 'installing...'
                  : binaryStatus?.ytDlpVersion ?? 'missing'}
              </span>
              {!isProvisioningBinaries && (
                <button
                  type="button"
                  onClick={() => void handleProvisionOrUpdateBinaries()}
                  title={ytDlpReady ? 'Update yt-dlp binary' : 'Install yt-dlp binary'}
                  aria-label={ytDlpReady ? 'Update yt-dlp binary' : 'Install yt-dlp binary'}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  {ytDlpReady ? (
                    <>
                      <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
                      <span>Update</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 text-[var(--status-err)]" strokeWidth={1.75} />
                      <span className="text-[var(--status-err)]">Install</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <span className="h-3.5 w-px bg-[var(--border-hairline)]" aria-hidden="true" />

            {/* ffmpeg Status */}
            <div
              className="inline-flex items-center gap-2"
              title={
                ffmpegAvailable
                  ? binaryStatus?.ffmpegPath ?? 'ffmpeg available'
                  : 'ffmpeg not found on PATH — audio conversion may fail'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  ffmpegAvailable ? 'bg-[var(--status-ok)]' : 'bg-[var(--status-warn)]'
                }`}
                aria-hidden="true"
              />
              <span className="font-mono-tabular text-[var(--text-secondary)]">
                ffmpeg {ffmpegAvailable ? 'ready' : 'missing'}
              </span>
            </div>

            <span className="h-3.5 w-px bg-[var(--border-hairline)]" aria-hidden="true" />

            {/* Active Concurrency */}
            <span className="font-mono-tabular text-[var(--text-muted)]">
              jobs{' '}
              <span className={activeCount > 0 ? 'text-[var(--accent-text)] font-medium' : ''}>
                {activeCount}
              </span>
              /{settings.maxConcurrent}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleOpenOutputDir()}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-0.5 font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--accent-text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Open Folder</span>
          </button>
        </div>
      </footer>

      {/* Floating Bottom-Right Toast */}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-12 z-40 flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-panel)] px-4 py-3 text-[0.8125rem] font-medium text-[var(--text-primary)] shadow-lg"
        >
          <div className="flex min-w-0 items-center gap-2">
            {toast.type === 'success' && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--status-ok)]" strokeWidth={1.75} />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--status-warn)]" strokeWidth={1.75} />
            )}
            {toast.type === 'error' && (
              <XCircle className="h-4 w-4 shrink-0 text-[var(--status-err)]" strokeWidth={1.75} />
            )}
            {toast.type === 'info' && (
              <Info className="h-4 w-4 shrink-0 text-[var(--accent-text)]" strokeWidth={1.75} />
            )}
            <span className="truncate">{toast.message}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {toast.actionUrl && toast.actionLabel && (
              <button
                type="button"
                onClick={() => void handleOpenExternalUrl(toast.actionUrl!)}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
              >
                <span>{toast.actionLabel}</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SuspenseLoader fallback={null}>
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetDefaults={handleResetAppearanceDefaults}
            onChangeOutputDir={() => void handleChangeOutputDir()}
          />
        </SuspenseLoader>
      )}

      {aboutOpen && (
        <SuspenseLoader fallback={null}>
          <AboutModal
            isOpen={aboutOpen}
            onClose={() => setAboutOpen(false)}
            binaryStatus={binaryStatus}
            onOpenExternalUrl={(url) => void handleOpenExternalUrl(url)}
          />
        </SuspenseLoader>
      )}
    </div>
  );
};

export default App;
