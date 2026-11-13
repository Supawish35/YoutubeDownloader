import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Captions,
  Check,
  ClipboardPaste,
  Download,
  FolderOpen,
  FolderSearch,
  Image as ImageIcon,
  Link2,
  ListPlus,
  ListVideo,
  Music,
  Plus,
  RotateCcw,
  Scissors,
  Video,
  X,
} from 'lucide-react';
import PlaylistModal from '~components/PlaylistModal';
import PrecisionSelect from '~components/PrecisionSelect';
import PreviewCard from '~components/PreviewCard';
import {
  AUDIO_FORMAT_OPTIONS,
  getFormatOption,
  getResolutionOption,
  PRESET_OPTIONS,
  type PresetId,
  QUICK_PRESETS,
  resolveActivePresetId,
  supportsCoverArt,
  VIDEO_FORMAT_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from '@/lib/mediaFormats';
import { detectMediaSource } from '@/lib/mediaSources';
import { formatSecsToTimestamp, validateClipRange } from '@/lib/timeUtils';
import type {
  AudioFormat,
  DownloadItemOptions,
  MediaFormat,
  MediaType,
  PlaylistEntry,
  PlaylistMetadata,
  VideoFormat,
  VideoMetadata,
  VideoResolution,
} from '~types/downloader';

const PLAYLIST_URL_PATTERN = /[?&]list=|\/playlist\b|\/sets\//i;
const PURE_PLAYLIST_PATH_PATTERN = /\/playlist\b|\/sets\//i;

function isPurePlaylistUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (PURE_PLAYLIST_PATH_PATTERN.test(trimmed)) return true;
  return /[?&]list=/i.test(trimmed) && !/[?&]v=/i.test(trimmed);
}

export interface ControlPanelProps {
  defaultType: MediaType;
  onModeChange: (mode: MediaType) => void;
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
  onDownloadMedia: (
    url: string,
    mediaType: MediaType,
    prefetchedMeta?: VideoMetadata | null,
    options?: DownloadItemOptions
  ) => Promise<boolean>;
  onAddToQueue: (
    url: string,
    mediaType: MediaType,
    prefetchedMeta?: VideoMetadata | null,
    options?: DownloadItemOptions
  ) => Promise<boolean>;
  onEnqueuePlaylistEntries?: (
    entries: PlaylistEntry[],
    mediaType: MediaType,
    startImmediately: boolean,
    options?: DownloadItemOptions
  ) => Promise<void>;
  batchModalOpen?: boolean;
  onBatchModalOpenChange?: (open: boolean) => void;
  onEnqueueBatchUrls?: (
    urls: string[],
    mediaType: MediaType,
    startImmediately: boolean,
    options?: DownloadItemOptions
  ) => Promise<void>;
  validateUrlFn: (url: string) => Promise<string>;
  fetchPreviewFn?: (url: string) => Promise<VideoMetadata>;
  fetchPlaylistFn?: (url: string) => Promise<PlaylistMetadata>;
  binaryReady: boolean;
  showThumbnails?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  defaultType,
  onModeChange,
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
  onEnqueuePlaylistEntries,
  batchModalOpen,
  onBatchModalOpenChange,
  onEnqueueBatchUrls,
  validateUrlFn,
  fetchPreviewFn,
  fetchPlaylistFn,
  binaryReady,
  showThumbnails = true,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<MediaType>(defaultType);
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<VideoMetadata | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Phase 3: Clipboard focus detector & drag/drop state
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);
  const [dismissedClipboardUrl, setDismissedClipboardUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Phase 5: Trim & Subtitles + Playlist Inspector + Batch Modal state
  const [showTrimSubs, setShowTrimSubs] = useState(false);
  const [clipStart, setClipStart] = useState('');
  const [clipEnd, setClipEnd] = useState('');
  const [embedSubs, setEmbedSubs] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistData, setPlaylistData] = useState<PlaylistMetadata | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [internalBatchModalOpen, setInternalBatchModalOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  const previewReqIdRef = useRef(0);
  const playlistReqIdRef = useRef(0);
  const urlInputRef = useRef(urlInput);
  const urlInputElementRef = useRef<HTMLInputElement>(null);
  const batchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dismissedClipboardUrlRef = useRef(dismissedClipboardUrl);
  const shortcutActionRef = useRef<() => void>(() => { });

  urlInputRef.current = urlInput;
  dismissedClipboardUrlRef.current = dismissedClipboardUrl;

  const isBatchModalOpen = batchModalOpen !== undefined ? batchModalOpen : internalBatchModalOpen;
  const setIsBatchModalOpen = useCallback(
    (open: boolean) => {
      onBatchModalOpenChange?.(open);
      if (batchModalOpen === undefined) {
        setInternalBatchModalOpen(open);
      }
    },
    [batchModalOpen, onBatchModalOpenChange]
  );

  const clipValidation = useMemo(
    () => validateClipRange(clipStart, clipEnd, previewMeta?.durationSecs),
    [clipStart, clipEnd, previewMeta?.durationSecs]
  );

  const extractedBatchUrls = useMemo(() => {
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const rawLine of batchText.split(/\r?\n/)) {
      const trimmed = rawLine.trim();
      if (!trimmed || !/^https?:\/\/\S+$/i.test(trimmed)) continue;
      try {
        const parsed = new URL(trimmed);
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      } catch {
        // Ignore malformed URLs
      }
    }
    return urls;
  }, [batchText]);

  useEffect(() => {
    if (!isBatchModalOpen) return;
    const focusTimer = window.setTimeout(() => {
      batchTextareaRef.current?.focus();
    }, 0);
    const handleBatchKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsBatchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleBatchKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleBatchKeyDown);
    };
  }, [isBatchModalOpen, setIsBatchModalOpen]);

  useEffect(() => {
    setMode(defaultType);
  }, [defaultType]);

  useEffect(() => {
    const trimmed = urlInput.trim();
    previewReqIdRef.current += 1;
    setPreviewMeta(null);
    setPreviewLoading(false);

    if (validationState !== 'valid' || !trimmed || !fetchPreviewFn || !binaryReady) {
      return;
    }

    const timerId = window.setTimeout(() => {
      previewReqIdRef.current += 1;
      const reqId = previewReqIdRef.current;
      setPreviewLoading(true);

      void fetchPreviewFn(trimmed)
        .then((data) => {
          if (previewReqIdRef.current !== reqId) return;
          setPreviewMeta(data);
          setPreviewLoading(false);
        })
        .catch(() => {
          if (previewReqIdRef.current !== reqId) return;
          setPreviewMeta(null);
          setPreviewLoading(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timerId);
      previewReqIdRef.current += 1;
    };
  }, [urlInput, validationState, fetchPreviewFn, binaryReady]);

  // Phase 3: Clipboard Focus Detector Banner
  useEffect(() => {
    let cancelled = false;

    const inspectClipboardOnFocus = async () => {
      if (urlInputRef.current.trim()) return;
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
      try {
        const text = await navigator.clipboard.readText();
        if (cancelled || urlInputRef.current.trim()) return;
        const trimmed = text.trim();
        if (!trimmed || trimmed === dismissedClipboardUrlRef.current) return;
        await validateUrlFn(trimmed);
        if (cancelled || urlInputRef.current.trim()) return;
        setDetectedClipboardUrl(trimmed);
      } catch {
        // Ignore non-URL clipboard contents or denied clipboard permission
      }
    };

    window.addEventListener('focus', inspectClipboardOnFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', inspectClipboardOnFocus);
    };
  }, [validateUrlFn]);

  const buildDownloadOptions = (): DownloadItemOptions => ({
    clipStart: clipStart.trim() || undefined,
    clipEnd: clipEnd.trim() || undefined,
    embedSubs: mode === 'video' ? embedSubs : false,
  });

  const handleModeSelect = (nextMode: MediaType) => {
    setMode(nextMode);
    onModeChange(nextMode);
  };

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
    if (value.trim()) {
      setDetectedClipboardUrl(null);
    } else {
      setValidationState('idle');
      setValidationError(null);
      setPreviewMeta(null);
      setPreviewLoading(false);
      return;
    }
    void runValidation(value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
      }
    } catch {
      setValidationError('Clipboard access unavailable. Paste with Ctrl+V.');
      setValidationState('invalid');
    }
  };

  const handleClear = () => {
    previewReqIdRef.current += 1;
    setUrlInput('');
    setValidationState('idle');
    setValidationError(null);
    setPreviewMeta(null);
    setPreviewLoading(false);
  };

  const submitUrl = async (mediaType: MediaType, startImmediately: boolean) => {
    if (isSubmitting) return;

    const isValid = await runValidation(urlInput);
    if (!isValid) {
      if (!urlInput.trim()) {
        setValidationState('invalid');
        setValidationError('Paste a media URL first.');
      }
      return;
    }

    const trimmed = urlInput.trim();
    if (fetchPlaylistFn && isPurePlaylistUrl(trimmed)) {
      await handleOpenPlaylistModal();
      return;
    }

    if (!clipValidation.valid) {
      setShowTrimSubs(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const metaForJob = previewMeta?.url === trimmed || previewMeta ? previewMeta : null;
      const options = buildDownloadOptions();
      const ok = startImmediately
        ? await onDownloadMedia(trimmed, mediaType, metaForJob, options)
        : await onAddToQueue(trimmed, mediaType, metaForJob, options);
      if (ok) {
        handleClear();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBatch = async (startImmediately: boolean) => {
    if (isSubmitting || extractedBatchUrls.length === 0) return;
    if (startImmediately && !binaryReady) return;
    const urlsToEnqueue = [...extractedBatchUrls];
    const options = clipValidation.valid ? buildDownloadOptions() : undefined;
    setIsBatchModalOpen(false);
    setIsSubmitting(true);
    try {
      if (onEnqueueBatchUrls) {
        await onEnqueueBatchUrls(urlsToEnqueue, mode, startImmediately, options);
      } else {
        for (const url of urlsToEnqueue) {
          if (startImmediately) {
            await onDownloadMedia(url, mode, null, options);
          } else {
            await onAddToQueue(url, mode, null, options);
          }
        }
      }
      setBatchText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseClipboardBanner = () => {
    if (!detectedClipboardUrl) return;
    const url = detectedClipboardUrl;
    setDetectedClipboardUrl(null);
    handleUrlChange(url);
  };

  const handleDownloadClipboardBanner = async () => {
    if (!detectedClipboardUrl || isSubmitting || !binaryReady) return;
    const url = detectedClipboardUrl;
    setDismissedClipboardUrl(url);
    setDetectedClipboardUrl(null);
    setIsSubmitting(true);
    try {
      await onDownloadMedia(url, mode, null, buildDownloadOptions());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissClipboardBanner = () => {
    if (detectedClipboardUrl) {
      setDismissedClipboardUrl(detectedClipboardUrl);
    }
    setDetectedClipboardUrl(null);
  };

  // Phase 3: Global Ctrl+Shift+V / Cmd+Shift+V paste & download immediately
  shortcutActionRef.current = () => {
    if (isSubmitting || !binaryReady) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;

    void (async () => {
      try {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (!trimmed) {
          setValidationState('invalid');
          setValidationError('Clipboard is empty.');
          return;
        }
        await validateUrlFn(trimmed);
        setValidationError(null);
        setDismissedClipboardUrl(trimmed);
        setDetectedClipboardUrl(null);
        setIsSubmitting(true);
        try {
          await onDownloadMedia(trimmed, mode, null, buildDownloadOptions());
        } finally {
          setIsSubmitting(false);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Clipboard does not contain a valid media URL';
        setValidationState('invalid');
        setValidationError(message || 'Clipboard does not contain a valid media URL');
      }
    })();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        shortcutActionRef.current();
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'l'
      ) {
        event.preventDefault();
        urlInputElementRef.current?.focus();
        urlInputElementRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submitUrl(mode, !e.shiftKey);
    }
  };

  // Phase 3: Drag & Drop URL onto ControlPanel section
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const rawUriList = e.dataTransfer.getData('text/uri-list');
    const rawPlain = e.dataTransfer.getData('text/plain');
    const extractedUri =
      rawUriList
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith('#')) ?? '';
    const droppedUrl = (extractedUri || rawPlain).trim();
    if (droppedUrl) {
      handleUrlChange(droppedUrl);
    }
  };

  // Phase 5: Quick Preset Selection
  const activePresetId = resolveActivePresetId(
    mode,
    selectedVideoFormat,
    selectedResolution,
    selectedAudioFormat,
    embedThumbnail
  );

  const handlePresetChange = (presetId: PresetId) => {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    handleModeSelect(preset.mode);
    if (preset.mode === 'video') {
      if (preset.videoFormat) {
        onFormatChange(preset.videoFormat);
      }
      if (preset.resolution) {
        onResolutionChange(preset.resolution);
      }
    } else {
      if (preset.audioFormat) {
        onFormatChange(preset.audioFormat);
      }
      if (preset.embedThumbnail !== undefined) {
        onEmbedThumbnailChange(preset.embedThumbnail);
      }
    }
  };

  // Phase 5: Playlist Inspector Modal handlers
  const handleOpenPlaylistModal = async () => {
    if (!fetchPlaylistFn) return;

    let targetUrl = urlInput.trim();

    if (!targetUrl) {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        try {
          const clipText = (await navigator.clipboard.readText()).trim();
          if (clipText) {
            const ok = await runValidation(clipText);
            if (ok) {
              setUrlInput(clipText);
              setDetectedClipboardUrl(null);
              targetUrl = clipText;
            }
          }
        } catch {
          // Clipboard read unavailable
        }
      }
      if (!targetUrl) {
        setValidationState('invalid');
        setValidationError('Paste a playlist URL first or copy one to your clipboard.');
        return;
      }
    } else if (validationState !== 'valid') {
      const ok = await runValidation(targetUrl);
      if (!ok) return;
    }

    playlistReqIdRef.current += 1;
    const reqId = playlistReqIdRef.current;

    setPlaylistModalOpen(true);
    setPlaylistData(null);
    setPlaylistError(null);
    setPlaylistLoading(true);

    try {
      const data = await fetchPlaylistFn(targetUrl);
      if (playlistReqIdRef.current !== reqId) return;
      setPlaylistData(data);
      setPlaylistLoading(false);
    } catch (err) {
      if (playlistReqIdRef.current !== reqId) return;
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Unable to inspect playlist entries';
      setPlaylistError(message || 'Unable to inspect playlist entries');
      setPlaylistLoading(false);
    }
  };

  const handleClosePlaylistModal = () => {
    playlistReqIdRef.current += 1;
    setPlaylistModalOpen(false);
  };

  const handleConfirmPlaylist = async (
    entries: PlaylistEntry[],
    startImmediately: boolean,
    modeOverride?: MediaType
  ) => {
    setPlaylistModalOpen(false);
    if (!onEnqueuePlaylistEntries || entries.length === 0) return;
    const effectiveMode = modeOverride ?? mode;
    setIsSubmitting(true);
    try {
      await onEnqueuePlaylistEntries(entries, effectiveMode, startImmediately, {
        clipStart: clipStart.trim() || undefined,
        clipEnd: clipEnd.trim() || undefined,
        embedSubs: effectiveMode === 'video' ? embedSubs : false,
      });
      handleClear();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBorderClass = isDraggingOver
    ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
    : validationState === 'invalid'
      ? 'border-[var(--status-err)] focus-within:ring-1 focus-within:ring-[var(--status-err)]'
      : validationState === 'valid'
        ? 'border-[var(--status-ok)]/70 focus-within:ring-1 focus-within:ring-[var(--status-ok)]'
        : 'border-[var(--border-hairline)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-subtle)]';

  const detectedSource =
    validationState === 'valid' && urlInput.trim() ? detectMediaSource(urlInput) : null;
  const isPlaylistUrl = PLAYLIST_URL_PATTERN.test(urlInput);
  const videoBadge = getFormatOption(selectedVideoFormat).badge;
  const resBadge = getResolutionOption(selectedResolution).badge;
  const audioBadge = getFormatOption(selectedAudioFormat).badge;
  const coverArtSupported = supportsCoverArt(selectedAudioFormat);
  const coverArtTitle = !coverArtSupported
    ? 'WAV container does not support embedded cover art'
    : 'Embed thumbnail as cover art for Audio downloads (--embed-thumbnail)';

  const activeFormatBadge = mode === 'video' ? videoBadge : audioBadge;
  const downloadSpecBadge = mode === 'video' ? `${videoBadge} · ${resBadge}` : audioBadge;
  const hasTrimOrSubsActive = Boolean(
    clipStart.trim() || clipEnd.trim() || (mode === 'video' && embedSubs)
  );

  const rawDurationSecs = previewMeta?.durationSecs;
  const hasKnownDuration =
    rawDurationSecs !== null &&
    rawDurationSecs !== undefined &&
    Number.isFinite(rawDurationSecs) &&
    rawDurationSecs > 0;
  const sliderMax = hasKnownDuration ? Math.max(1, Math.floor(rawDurationSecs)) : 0;
  const startSliderVal =
    hasKnownDuration && clipValidation.startSecs !== null
      ? Math.min(Math.max(0, clipValidation.startSecs), sliderMax)
      : 0;
  const endSliderVal =
    hasKnownDuration && clipValidation.endSecs !== null
      ? Math.min(Math.max(0, clipValidation.endSecs), sliderMax)
      : sliderMax;
  const rangeValidForBar = startSliderVal <= endSliderVal && sliderMax > 0;
  const startPct = rangeValidForBar ? (startSliderVal / sliderMax) * 100 : 0;
  const endPct = rangeValidForBar ? (endSliderVal / sliderMax) * 100 : 100;
  const clipLengthSecs = hasKnownDuration ? Math.max(0, endSliderVal - startSliderVal) : null;
  const first30End = Math.min(30, sliderMax);
  const first1mEnd = Math.min(60, sliderMax);
  const isFirst30Active =
    hasKnownDuration &&
    startSliderVal === 0 &&
    endSliderVal === first30End &&
    Boolean(clipStart.trim() || clipEnd.trim());
  const isFirst1mActive =
    hasKnownDuration &&
    sliderMax > 30 &&
    startSliderVal === 0 &&
    endSliderVal === first1mEnd &&
    Boolean(clipStart.trim() || clipEnd.trim());
  const isFullRangeActive = !clipStart.trim() && !clipEnd.trim();
  const batchCount = extractedBatchUrls.length;
  const batchModeLabel = mode === 'video' ? 'Video' : 'Audio';

  return (
    <section
      aria-label="Download controls"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="shrink-0 border-b border-[var(--border-hairline)] bg-[var(--bg-panel)] px-5 py-4 sm:px-6"
    >
      {/* Row 1: URL Intake + Mode Switch + Single Download CTA + Add to Queue + Playlist */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`flex h-11 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border bg-[var(--bg-inset)] px-3.5 transition-colors duration-150 ${inputBorderClass}`}
        >
          <Link2
            className={`h-4 w-4 shrink-0 ${isDraggingOver
              ? 'text-[var(--accent-text)]'
              : validationState === 'valid'
                ? 'text-[var(--status-ok)]'
                : validationState === 'invalid'
                  ? 'text-[var(--status-err)]'
                  : 'text-[var(--text-muted)]'
              }`}
            strokeWidth={1.5}
          />
          <input
            ref={urlInputElementRef}
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
            title="Paste URL from clipboard (Ctrl+Shift+V to download immediately)"
            aria-label="Paste URL from clipboard"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <ClipboardPaste className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
            <span>Paste</span>
          </button>
        </div>

        {/* Mode Switch + Primary Download CTA + Add to Queue + Playlist */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            disabled={isSubmitting}
            aria-label="Batch paste URLs"
            title="Paste multiple URLs at once to queue or download"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3 text-sm font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:w-[6rem]"
          >
            <ListPlus className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.75} />
            <span>Batch</span>
          </button>

          {fetchPlaylistFn && (
            <button
              type="button"
              onClick={() => void handleOpenPlaylistModal()}
              disabled={!binaryReady || isSubmitting}
              aria-label="Inspect playlist"
              title={
                binaryReady
                  ? 'Inspect playlist entries and choose Video or Audio (reads clipboard if URL is empty)'
                  : 'Install yt-dlp first to inspect playlists'
              }
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:w-[6.75rem] ${isPlaylistUrl
                ? 'border-[var(--accent)]/50 bg-[var(--accent-subtle)] text-[var(--accent-text)] hover:border-[var(--accent)]'
                : 'border-[var(--border-hairline)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              <ListVideo className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Playlist</span>
            </button>
          )}

          <div
            role="radiogroup"
            aria-label="Download mode"
            className="inline-flex h-11 shrink-0 items-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'video'}
              onClick={() => handleModeSelect('video')}
              className={`inline-flex h-full w-[5.25rem] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${mode === 'video'
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
              onClick={() => handleModeSelect('audio')}
              className={`inline-flex h-full w-[5.25rem] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${mode === 'audio'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Music className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>Audio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void submitUrl(mode, true)}
            disabled={isSubmitting || !binaryReady}
            title={
              binaryReady
                ? `Download ${mode === 'video' ? 'Video' : 'Audio'} immediately (${downloadSpecBadge})`
                : 'Install yt-dlp first to start downloads'
            }
            aria-label={`Download ${mode === 'video' ? 'Video' : 'Audio'} (${downloadSpecBadge})`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:flex-initial"
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={() => void submitUrl(mode, false)}
            disabled={isSubmitting}
            aria-label="Add to queue"
            title="Add to queue in current mode (Shift+Enter)"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3 text-sm font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer sm:w-[6.25rem]"
          >
            <Plus className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.75} />
            <span>Queue</span>
          </button>


        </div>
      </div>

      {/* Phase 3: Clipboard Focus Detector Banner */}
      {detectedClipboardUrl && (
        <div
          role="region"
          aria-label="Clipboard URL detected"
          className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--accent)]/35 bg-[var(--accent-subtle)] px-3 py-2"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="font-mono-tabular shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase text-[var(--accent-text)]">
              {detectMediaSource(detectedClipboardUrl)}
            </span>
            <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
              Clipboard URL:
            </span>
            <span
              className="font-mono-tabular min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]"
              title={detectedClipboardUrl}
            >
              {detectedClipboardUrl}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleUseClipboardBanner}
              className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
              <span>Paste</span>
            </button>

            <button
              type="button"
              disabled={!binaryReady || isSubmitting}
              onClick={() => void handleDownloadClipboardBanner()}
              className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent)] px-2.5 text-xs font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleDismissClipboardBanner}
              aria-label="Dismiss detected clipboard URL"
              title="Dismiss"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

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

      {/* URL Preview Card */}
      <PreviewCard
        meta={previewMeta}
        loading={previewLoading}
        showThumbnails={showThumbnails}
        mode={mode}
        formatBadge={activeFormatBadge}
        resolutionBadge={resBadge}
        embedThumbnail={coverArtSupported && embedThumbnail}
        isPlaylistUrl={isPlaylistUrl}
        onInspectPlaylist={fetchPlaylistFn ? () => void handleOpenPlaylistModal() : undefined}
      />

      {/* Row 2: Output Folder + Hint (Left) & Contextual Mode Options (Right) */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Inline Output Folder Strip + Shortcut Hint (Left) */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] md:inline">
            Dest
          </span>
          <button
            type="button"
            onClick={onChangeOutputDir}
            title={`Output directory: ${outputDir || 'Default Downloads folder'} — click to change`}
            className="inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3 text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer sm:max-w-[18rem]"
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
          <span className="hidden text-[0.6875rem] text-[var(--text-muted)] xl:inline">
            Enter to download · Shift+Enter to queue · Ctrl+Shift+V clipboard
          </span>
        </div>

        {/* Contextual Mode Options + Quick Presets + Trim / Subs (Right) */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PrecisionSelect<PresetId>
            value={activePresetId}
            options={PRESET_OPTIONS}
            onChange={handlePresetChange}
            prefix="Preset"
            ariaLabel="Quick download preset"
            triggerClassName="w-[10.5rem]"
            menuClassName="min-w-[16rem]"
            align="right"
          />

          {mode === 'video' ? (
            <>
              <PrecisionSelect<VideoFormat>
                value={selectedVideoFormat}
                options={VIDEO_FORMAT_OPTIONS}
                onChange={(fmt) => onFormatChange(fmt)}
                prefix="Video"
                ariaLabel="Video file extension"
                triggerClassName="w-[8.25rem]"
                menuClassName="min-w-[16rem]"
                align="right"
              />

              <PrecisionSelect<VideoResolution>
                value={selectedResolution}
                options={VIDEO_RESOLUTION_OPTIONS}
                onChange={onResolutionChange}
                prefix="Res"
                ariaLabel="Video maximum resolution"
                triggerClassName="w-[9.25rem]"
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
                ariaLabel="Audio file extension"
                triggerClassName="w-[8.25rem]"
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
                title={coverArtTitle}
                className={`inline-flex h-9 w-[9.25rem] items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${coverArtSupported
                  ? 'text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer'
                  : 'text-[var(--text-muted)] opacity-45 cursor-not-allowed'
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ImageIcon
                    className={`h-4 w-4 shrink-0 transition-colors ${coverArtSupported && embedThumbnail
                      ? 'text-[var(--accent-text)]'
                      : 'text-[var(--text-muted)]'
                      }`}
                    strokeWidth={1.5}
                  />
                  <span>Cover Art</span>
                </span>
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150 ${coverArtSupported && embedThumbnail
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--border-strong)]'
                    }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full transition-transform duration-150 ${coverArtSupported && embedThumbnail
                      ? 'translate-x-[0.875rem] bg-[var(--accent-fg)]'
                      : 'translate-x-[0.125rem] bg-white'
                      }`}
                  />
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            aria-expanded={showTrimSubs}
            onClick={() => setShowTrimSubs((prev) => !prev)}
            title="Trim clip range and subtitle options"
            className={`inline-flex h-9 w-[7.75rem] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${showTrimSubs || hasTrimOrSubsActive
              ? 'border-[var(--accent)]/50 bg-[var(--accent-subtle)] text-[var(--accent-text)]'
              : 'border-[var(--border-hairline)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Scissors className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>Trim / Subs</span>
          </button>
        </div>
      </div>

      {/* Phase 5: Collapsible Trim & Subtitles Strip */}
      {showTrimSubs && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Start
                </span>
                <input
                  type="text"
                  value={clipStart}
                  onChange={(e) => setClipStart(e.target.value)}
                  placeholder="00:00"
                  aria-label="Clip start time"
                  aria-invalid={!clipValidation.valid}
                  className={`font-mono-tabular h-7 w-24 rounded-[var(--radius-sm)] border bg-[var(--bg-panel)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none ${!clipValidation.valid
                    ? 'border-[var(--status-err)] focus:border-[var(--status-err)]'
                    : 'border-[var(--border-hairline)] focus:border-[var(--accent)]'
                    }`}
                />
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  End
                </span>
                <input
                  type="text"
                  value={clipEnd}
                  onChange={(e) => setClipEnd(e.target.value)}
                  placeholder={hasKnownDuration ? formatSecsToTimestamp(sliderMax) : '02:30'}
                  aria-label="Clip end time"
                  aria-invalid={!clipValidation.valid}
                  className={`font-mono-tabular h-7 w-24 rounded-[var(--radius-sm)] border bg-[var(--bg-panel)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none ${!clipValidation.valid
                    ? 'border-[var(--status-err)] focus:border-[var(--status-err)]'
                    : 'border-[var(--border-hairline)] focus:border-[var(--accent)]'
                    }`}
                />
              </label>

              <button
                type="button"
                role="switch"
                aria-checked={mode === 'video' ? embedSubs : false}
                aria-disabled={mode !== 'video'}
                disabled={mode !== 'video'}
                onClick={() => setEmbedSubs((prev) => !prev)}
                title={
                  mode === 'video'
                    ? 'Embed subtitles into video container (--embed-subs)'
                    : 'Subtitles apply to Video downloads'
                }
                className={`inline-flex h-7 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${mode === 'video'
                  ? 'text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer'
                  : 'text-[var(--text-muted)] opacity-45 cursor-not-allowed'
                  }`}
              >
                <Captions
                  className={`h-3.5 w-3.5 ${mode === 'video' && embedSubs
                    ? 'text-[var(--accent-text)]'
                    : 'text-[var(--text-muted)]'
                    }`}
                  strokeWidth={1.5}
                />
                <span>Embed Subtitles</span>
                <span
                  className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-150 ${mode === 'video' && embedSubs ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                    }`}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 transform rounded-full transition-transform duration-150 ${mode === 'video' && embedSubs
                      ? 'translate-x-[0.75rem] bg-[var(--accent-fg)]'
                      : 'translate-x-[0.125rem] bg-white'
                      }`}
                  />
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {hasKnownDuration && clipLengthSecs !== null && clipValidation.valid && (
                <span className="font-mono-tabular inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2 text-[0.6875rem] font-medium text-[var(--accent-text)]">
                  Clip: {formatSecsToTimestamp(clipLengthSecs)}
                </span>
              )}

              {hasTrimOrSubsActive && (
                <button
                  type="button"
                  onClick={() => {
                    setClipStart('');
                    setClipEnd('');
                    setEmbedSubs(false);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {hasKnownDuration && sliderMax > 0 && (
            <div className="flex flex-col gap-2 border-t border-[var(--border-hairline)] pt-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="font-mono-tabular shrink-0 text-[0.6875rem] text-[var(--text-muted)]">
                  {formatSecsToTimestamp(startSliderVal)}
                </span>

                <div className="relative flex h-6 flex-1 items-center">
                  <div className="h-1.5 w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-panel)]" />
                  <div
                    className="pointer-events-none absolute h-1.5 rounded-full bg-[var(--accent)]"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(0, endPct - startPct)}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={1}
                    value={startSliderVal}
                    aria-label="Clip start slider"
                    onChange={(e) => {
                      const nextStart = Math.min(Number(e.target.value), Math.max(0, endSliderVal - 1));
                      setClipStart(
                        nextStart === 0 && !clipEnd.trim() ? '' : formatSecsToTimestamp(nextStart)
                      );
                    }}
                    className={`pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--accent-fg)] [&::-moz-range-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--accent-fg)] [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:active:cursor-grabbing ${startSliderVal > sliderMax - 5 ? 'z-20' : 'z-10'
                      }`}
                  />
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={1}
                    value={endSliderVal}
                    aria-label="Clip end slider"
                    onChange={(e) => {
                      const nextEnd = Math.max(
                        Number(e.target.value),
                        Math.min(sliderMax, startSliderVal + 1)
                      );
                      setClipEnd(
                        nextEnd >= sliderMax && !clipStart.trim()
                          ? ''
                          : formatSecsToTimestamp(nextEnd)
                      );
                    }}
                    className="pointer-events-none absolute inset-0 z-10 h-6 w-full appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--accent-fg)] [&::-moz-range-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--accent-fg)] [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:active:cursor-grabbing"
                  />
                </div>

                <span className="font-mono-tabular shrink-0 text-[0.6875rem] text-[var(--text-muted)]">
                  {formatSecsToTimestamp(endSliderVal)}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setClipStart('00:00');
                    setClipEnd(formatSecsToTimestamp(first30End));
                  }}
                  className={`inline-flex h-6 items-center rounded-[var(--radius-sm)] border px-2 text-[0.6875rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${isFirst30Active
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  First 30s
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClipStart('00:00');
                    setClipEnd(formatSecsToTimestamp(first1mEnd));
                  }}
                  className={`inline-flex h-6 items-center rounded-[var(--radius-sm)] border px-2 text-[0.6875rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${isFirst1mActive
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  First 1m
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClipStart('');
                    setClipEnd('');
                  }}
                  className={`inline-flex h-6 items-center rounded-[var(--radius-sm)] border px-2 text-[0.6875rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${isFullRangeActive
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  Full
                </button>
              </div>
            </div>
          )}

          {!clipValidation.valid && clipValidation.error && (
            <div
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-err)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>{clipValidation.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Phase 5: Playlist Inspector Modal */}
      <PlaylistModal
        isOpen={playlistModalOpen}
        onClose={handleClosePlaylistModal}
        playlist={playlistData}
        loading={playlistLoading}
        error={playlistError}
        mode={mode}
        onModeChange={handleModeSelect}
        selectedVideoFormat={selectedVideoFormat}
        selectedAudioFormat={selectedAudioFormat}
        onFormatChange={onFormatChange}
        selectedResolution={selectedResolution}
        onResolutionChange={onResolutionChange}
        embedThumbnail={embedThumbnail}
        onEmbedThumbnailChange={onEmbedThumbnailChange}
        formatBadge={activeFormatBadge}
        onConfirm={(entries, startImmediately, modeOverride) =>
          void handleConfirmPlaylist(entries, startImmediately, modeOverride)
        }
      />

      {/* Batch Paste Modal */}
      {isBatchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
          onClick={() => setIsBatchModalOpen(false)}
        >
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--accent-text)]">
                  <ListPlus className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="batch-modal-title"
                      className="truncate text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
                    >
                      Batch Paste URLs
                    </h2>
                    <span className="font-mono-tabular inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--accent-text)]">
                      {mode === 'video' ? (
                        <Video className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      ) : (
                        <Music className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      )}
                      <span>{downloadSpecBadge}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)]">
                    Paste one media URL per line to queue or download as {batchModeLabel}.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                aria-label="Close batch paste modal"
                title="Close (Esc)"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3 px-6 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-tabular inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--accent-text)]">
                  {batchCount} valid {batchCount === 1 ? 'URL' : 'URLs'}
                </span>

                {batchText && (
                  <button
                    type="button"
                    onClick={() => setBatchText('')}
                    className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                  >
                    <X className="h-3 w-3" strokeWidth={1.75} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <textarea
                ref={batchTextareaRef}
                rows={8}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...'}
                aria-label="Batch media URLs"
                spellCheck={false}
                className="font-mono-tabular w-full resize-y rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-3 text-xs leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] focus:outline-none"
              />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-transparent px-3.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || batchCount === 0}
                  onClick={() => void handleSubmitBatch(false)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={1.75} />
                  <span>Queue {batchCount}</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !binaryReady || batchCount === 0}
                  onClick={() => void handleSubmitBatch(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-xs font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Download {batchCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ControlPanel;
