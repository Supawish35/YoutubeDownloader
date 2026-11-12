import React, { lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Info,
  Terminal,
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
import type {
  AppSettings,
  BinaryStatus,
  MediaFormat,
  QueueFilter,
  QueueItem,
  UpdateCheckResult,
} from '~types/downloader';

const QueueList = lazy(() => import('~components/QueueList'));
const AboutModal = lazy(() => import('~components/AboutModal'));

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
  embedThumbnail: true,
  darkMode: true,
  maxConcurrent: 3,
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
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

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

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Initial load: settings, binaries (with auto-provision if yt-dlp missing), and event listeners
  useEffect(() => {
    let active = true;
    let unlistenProgress: (() => void) | undefined;
    let unlistenBinary: (() => void) | undefined;

    const init = async () => {
      try {
        const loadedSettings = await getSettings();
        if (active) {
          setSettings(loadedSettings);
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

  const handleFormatChange = useCallback(
    (format: MediaFormat) => {
      void updateAndPersistSettings((prev) => ({ ...prev, defaultFormat: format }));
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
    void updateAndPersistSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, [updateAndPersistSettings]);

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

        const newItem: QueueItem = {
          jobId,
          url: validatedUrl,
          format: currentSettings.defaultFormat,
          embedThumbnail: currentSettings.embedThumbnail,
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
            format: currentSettings.defaultFormat,
            embedThumbnail: currentSettings.embedThumbnail,
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
  const activeCount = queue.filter(
    (item) =>
      item.status === 'fetchingMeta' ||
      item.status === 'downloading' ||
      item.status === 'converting'
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 transition-colors duration-200 dark:bg-[#0F172A] dark:text-[#F8FAFC]">
      <Header
        binaryStatus={binaryStatus}
        isProvisioningBinaries={isProvisioningBinaries}
        onProvisionOrUpdateBinaries={() => void handleProvisionOrUpdateBinaries()}
        isCheckingUpdate={isCheckingUpdate}
        updateInfo={updateInfo}
        onCheckUpdate={() => void handleCheckUpdate()}
        onOpenReleaseUrl={(url) => void handleOpenExternalUrl(url)}
        darkMode={settings.darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenAbout={() => setAboutOpen(true)}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="mx-auto mt-3 w-full max-w-5xl px-4 sm:px-6">
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-sm ${
              toast.type === 'success'
                ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                : toast.type === 'warning'
                  ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'
                  : toast.type === 'error'
                    ? 'border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]'
                    : 'border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-400'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0" />}
              {toast.type === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
              {toast.type === 'info' && <Info className="h-4 w-4 shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {toast.actionUrl && toast.actionLabel && (
                <button
                  type="button"
                  onClick={() => void handleOpenExternalUrl(toast.actionUrl!)}
                  className="inline-flex items-center gap-1 rounded-md bg-current/10 px-2.5 py-1 font-semibold underline-offset-2 hover:underline cursor-pointer"
                >
                  <span>{toast.actionLabel}</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 opacity-75 transition-opacity hover:opacity-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
        <ControlPanel
          selectedFormat={settings.defaultFormat}
          onFormatChange={handleFormatChange}
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
          />
        </SuspenseLoader>
      </main>

      {/* Bottom Utility Bar */}
      <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF]/80 px-4 py-2.5 text-xs text-[#64748B] backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E293B]/60 dark:text-[#94A3B8] sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-[#EC4899]" strokeWidth={1.75} />
              <span className="font-mono-tabular">
                yt-dlp: {binaryStatus?.ytDlpVersion ?? (isProvisioningBinaries ? 'installing...' : 'missing')}
              </span>
            </span>
            <span className="opacity-40">|</span>
            <span className="font-mono-tabular">
              ffmpeg: {binaryStatus?.ffmpegAvailable ? 'available' : 'missing'}
            </span>
            <span className="opacity-40">|</span>
            <span className="font-mono-tabular">
              Active jobs: {activeCount}/{settings.maxConcurrent}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleOpenOutputDir()}
            className="inline-flex items-center gap-1.5 font-medium text-slate-700 transition-colors hover:text-[#EC4899] cursor-pointer dark:text-slate-200 dark:hover:text-[#EC4899]"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Open Storage Folder</span>
          </button>
        </div>
      </footer>

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
