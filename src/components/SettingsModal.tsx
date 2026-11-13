import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  FolderSearch,
  Monitor,
  Moon,
  Music,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Video,
  X,
} from 'lucide-react';
import PrecisionSelect from '~components/PrecisionSelect';
import {
  AUDIO_FORMAT_OPTIONS,
  getFormatOption,
  VIDEO_FORMAT_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from '@/lib/mediaFormats';
import { BROWSER_COOKIE_OPTIONS } from '@/lib/mediaSources';
import type {
  AccentColor,
  AppSettings,
  AudioFormat,
  BrowserCookies,
  CornerStyle,
  FontScale,
  MediaType,
  ThemeMode,
  UiDensity,
  VideoFormat,
  VideoResolution,
} from '~types/downloader';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onResetDefaults: () => void;
  onChangeOutputDir: () => void;
}

type SettingsTab = 'appearance' | 'downloads';

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  Icon: React.FC<{ className?: string; strokeWidth?: number }>;
}[] = [
  { value: 'system', label: 'System', description: 'Follow OS theme', Icon: Monitor },
  { value: 'dark', label: 'Dark', description: 'Matte charcoal', Icon: Moon },
  { value: 'light', label: 'Light', description: 'Warm paper', Icon: Sun },
];

const ACCENT_OPTIONS: {
  value: AccentColor;
  label: string;
  swatch?: string;
}[] = [
  { value: 'vermilion', label: 'Vermilion', swatch: '#EA580C' },
  { value: 'crimson', label: 'Crimson', swatch: '#DC2626' },
  { value: 'cobalt', label: 'Cobalt', swatch: '#2563EB' },
  { value: 'emerald', label: 'Emerald', swatch: '#16A34A' },
  { value: 'amber', label: 'Amber', swatch: '#D97706' },
  { value: 'monochrome', label: 'Monochrome' },
];

const DENSITY_OPTIONS: { value: UiDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

const CORNER_OPTIONS: { value: CornerStyle; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'sharp', label: 'Sharp' },
];

const SCALE_OPTIONS: { value: FontScale; label: string; percent: string }[] = [
  { value: 'xs', label: 'XS', percent: '85%' },
  { value: 'sm', label: 'S', percent: '95%' },
  { value: 'md', label: 'M', percent: '105%' },
  { value: 'lg', label: 'L', percent: '120%' },
  { value: 'xl', label: 'XL', percent: '135%' },
];

const TYPE_OPTIONS: { value: MediaType; label: string; title: string }[] = [
  { value: 'audio', label: 'Audio', title: 'Start in Audio extraction mode' },
  { value: 'video', label: 'Video', title: 'Start in Video download mode' },
];

const CONCURRENT_OPTIONS = [1, 2, 3, 4, 5] as const;

function resolveDarkModeForTheme(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

const ThemePreviewGraphic: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  if (mode === 'system') {
    return (
      <div
        aria-hidden="true"
        className="flex h-12 w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)]"
      >
        <div className="flex w-1/2 flex-col bg-[#F4F3EF]">
          <div className="flex h-3 items-center gap-1 border-b border-[#DEDCD5] bg-[#FFFFFF] px-1.5">
            <span className="h-1 w-1 rounded-full bg-[#C5C2B8]" />
            <span className="h-1 w-4 rounded-full bg-[#DEDCD5]" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
            <div className="h-2 rounded-[2px] border border-[#DEDCD5] bg-[#FFFFFF]" />
            <div className="h-1 w-4/5 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
        <div className="flex w-1/2 flex-col border-l border-[var(--border-hairline)] bg-[#111113]">
          <div className="flex h-3 items-center justify-end gap-1 border-b border-white/10 bg-[#18181B] px-1.5">
            <span className="h-1 w-3 rounded-full bg-white/15" />
            <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
            <div className="h-2 rounded-[2px] border border-white/10 bg-[#18181B]" />
            <div className="h-1 w-3/4 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </div>
    );
  }

  const isDark = mode === 'dark';
  const canvasBg = isDark ? 'bg-[#111113]' : 'bg-[#F4F3EF]';
  const panelBg = isDark ? 'bg-[#18181B]' : 'bg-[#FFFFFF]';
  const borderCol = isDark ? 'border-white/10' : 'border-[#DEDCD5]';
  const mutedBar = isDark ? 'bg-white/15' : 'bg-[#C5C2B8]';

  return (
    <div
      aria-hidden="true"
      className={`flex h-12 w-full flex-col overflow-hidden rounded-[var(--radius-sm)] border ${borderCol} ${canvasBg}`}
    >
      <div className={`flex h-3 items-center justify-between border-b ${borderCol} ${panelBg} px-2`}>
        <div className="flex items-center gap-1">
          <span className={`h-1 w-1 rounded-full ${mutedBar}`} />
          <span className={`h-1 w-6 rounded-full ${mutedBar}`} />
        </div>
        <span className="h-1.5 w-3 rounded-full bg-[var(--accent)]" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 px-2 py-1.5">
        <div className={`flex items-center gap-1.5 rounded-[2px] border ${borderCol} ${panelBg} px-1.5 py-1`}>
          <span className="h-1.5 w-2.5 rounded-[1px] bg-[var(--accent)]" />
          <span className={`h-1 flex-1 rounded-full ${mutedBar}`} />
        </div>
        <div className="h-1 w-2/3 rounded-full bg-[var(--accent)] opacity-80" />
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
  onChangeOutputDir,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

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

  const activeScaleOption =
    SCALE_OPTIONS.find((opt) => opt.value === settings.fontScale) ?? SCALE_OPTIONS[2];

  const renderSegmentedOption = <T extends string>(
    options: { value: T; label: string; title?: string }[],
    current: T,
    ariaLabel: string,
    onSelect: (value: T) => void,
  ) => (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-0.5"
    >
      {options.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => onSelect(opt.value)}
            className={`inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
              active
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const activeFormatBadge =
    settings.defaultType === 'video'
      ? `VIDEO · ${getFormatOption(settings.defaultVideoFormat).badge} · ${settings.defaultVideoResolution.toUpperCase()}`
      : `AUDIO · ${getFormatOption(settings.defaultAudioFormat).badge}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--accent-text)]">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
              >
                Appearance &amp; Settings
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)]">
                Configure theme tokens, UI sizing, queue density, and download defaults.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings dialog"
            title="Close (Esc)"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6"
        >
          <button
            type="button"
            role="tab"
            id="settings-tab-appearance"
            aria-selected={activeTab === 'appearance'}
            aria-controls="settings-panel-appearance"
            onClick={() => setActiveTab('appearance')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Palette
              className={`h-4 w-4 ${
                activeTab === 'appearance' ? 'text-[var(--accent-text)]' : ''
              }`}
              strokeWidth={1.5}
            />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            role="tab"
            id="settings-tab-downloads"
            aria-selected={activeTab === 'downloads'}
            aria-controls="settings-panel-downloads"
            onClick={() => setActiveTab('downloads')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] cursor-pointer ${
              activeTab === 'downloads'
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Download
              className={`h-4 w-4 ${
                activeTab === 'downloads' ? 'text-[var(--accent-text)]' : ''
              }`}
              strokeWidth={1.5}
            />
            <span>Downloads</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'appearance' ? (
            <div
              role="tabpanel"
              id="settings-panel-appearance"
              aria-labelledby="settings-tab-appearance"
              className="space-y-5"
            >
              {/* Theme Mode */}
              <section aria-labelledby="settings-theme-heading">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h3
                    id="settings-theme-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Theme Mode
                  </h3>
                  <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                    {settings.themeMode.toUpperCase()}
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Theme mode"
                  className="grid grid-cols-3 gap-3"
                >
                  {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
                    const active = settings.themeMode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            themeMode: value,
                            darkMode: resolveDarkModeForTheme(value),
                          }))
                        }
                        className={`flex flex-col gap-2.5 rounded-[var(--radius-md)] border p-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-inset)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <ThemePreviewGraphic mode={value} />
                        <div className="flex items-center justify-between gap-1.5 px-0.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-primary)]">
                              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                              <span>{label}</span>
                            </div>
                            <p className="truncate text-[0.6875rem] text-[var(--text-muted)]">
                              {description}
                            </p>
                          </div>
                          {active && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
                              <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Accent Color */}
              <section aria-labelledby="settings-accent-heading">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h3
                    id="settings-accent-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Accent Color
                  </h3>
                  <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                    {settings.accentColor.toUpperCase()}
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Accent color"
                  className="grid grid-cols-3 gap-2.5"
                >
                  {ACCENT_OPTIONS.map((opt) => {
                    const active = settings.accentColor === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            accentColor: opt.value,
                          }))
                        }
                        className={`flex items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {opt.swatch ? (
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20"
                              style={{ backgroundColor: opt.swatch }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-[var(--border-strong)]"
                            >
                              <span className="h-full w-1/2 bg-[#18181B]" />
                              <span className="h-full w-1/2 bg-[#F4F4F5]" />
                            </span>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {active && (
                          <Check
                            className="h-4 w-4 shrink-0 text-[var(--accent-text)]"
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Layout & Sizing */}
              <section aria-labelledby="settings-geometry-heading">
                <h3
                  id="settings-geometry-heading"
                  className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Sizing &amp; Geometry
                </h3>

                <div className="divide-y divide-[var(--border-hairline)] rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  {/* UI Size (5-step range: 85% to 135%) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2 text-[0.8125rem] font-medium text-[var(--text-primary)]">
                        <span>UI Size</span>
                        <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--accent-text)]">
                          {activeScaleOption.percent}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Scale typography, controls, and icons from 85% to 135%.
                      </p>
                    </div>
                    {renderSegmentedOption(
                      SCALE_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                        title: `${opt.label} (${opt.percent})`,
                      })),
                      settings.fontScale,
                      'UI size scale',
                      (fontScale) =>
                        onUpdateSettings((prev) => ({ ...prev, fontScale })),
                    )}
                  </div>

                  {/* Queue Density */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                        Queue Density
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Row spacing and thumbnail dimensions in the queue.
                      </p>
                    </div>
                    {renderSegmentedOption(
                      DENSITY_OPTIONS,
                      settings.density,
                      'Queue density',
                      (density) =>
                        onUpdateSettings((prev) => ({ ...prev, density })),
                    )}
                  </div>

                  {/* Corner Style */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                        Corner Style
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Switch between balanced hardware curves and sharp chamfers.
                      </p>
                    </div>
                    {renderSegmentedOption(
                      CORNER_OPTIONS,
                      settings.cornerStyle,
                      'Corner style',
                      (cornerStyle) =>
                        onUpdateSettings((prev) => ({ ...prev, cornerStyle })),
                    )}
                  </div>

                  {/* Show Queue Thumbnails */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                        Queue Thumbnails
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Show 16:9 video preview thumbnails on each queue row.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.showThumbnails}
                      aria-label="Show queue thumbnails"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          showThumbnails: !prev.showThumbnails,
                        }))
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                        settings.showThumbnails
                          ? 'bg-[var(--accent)]'
                          : 'bg-[var(--border-strong)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-150 ${
                          settings.showThumbnails
                            ? 'translate-x-[1.125rem] bg-[var(--accent-fg)]'
                            : 'translate-x-[0.1875rem] bg-white'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              {/* Live Appearance Preview */}
              <section aria-labelledby="settings-preview-heading">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3
                    id="settings-preview-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Live Preview
                  </h3>
                  <span className="font-mono-tabular text-[0.6875rem] text-[var(--text-muted)]">
                    ACTIVE TOKENS
                  </span>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                >
                  <div className="flex items-center gap-3.5 px-4 py-[var(--row-py)]">
                    {settings.showThumbnails && (
                      <div className="relative flex h-[var(--thumb-h)] w-[var(--thumb-w)] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--text-muted)]">
                        <Music className="h-5 w-5 opacity-70" strokeWidth={1.5} />
                        <span className="font-mono-tabular absolute right-1 bottom-1 rounded-[0.125rem] bg-black/80 px-1 py-px text-[0.625rem] font-medium text-white">
                          03:42
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                          Hardware Synth Studio Session (24-bit Master)
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-secondary)]">
                            {settings.defaultFormat.toUpperCase()}
                          </span>
                          <span className="font-mono-tabular text-xs font-medium text-[var(--accent-text)]">
                            DL
                          </span>
                        </div>
                      </div>

                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-inset)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: '68%' }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-[var(--text-muted)]">
                          Analog Lab Archive
                        </span>
                        <span className="font-mono-tabular shrink-0 text-[var(--text-secondary)]">
                          4.2 MB/s · 68.0%
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-fg)]">
                      Active
                    </span>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div
              role="tabpanel"
              id="settings-panel-downloads"
              aria-labelledby="settings-tab-downloads"
              className="space-y-4"
            >
              {/* Default Download Type & Formats */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
                <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                      Default Mode &amp; Formats
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Startup download mode, per-type file extension, and video resolution cap.
                    </p>
                  </div>
                  <span className="font-mono-tabular inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-2 py-0.5 text-xs font-medium text-[var(--accent-text)]">
                    {settings.defaultType === 'video' ? (
                      <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <Music className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    <span>{activeFormatBadge}</span>
                  </span>
                </div>

                {/* Default Type Switch */}
                <div className="mb-3.5 flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-3.5">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      Default Download Type
                    </div>
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">
                      Media type used when pressing Enter (download) or Shift+Enter (queue) in the URL bar.
                    </p>
                  </div>
                  {renderSegmentedOption<MediaType>(
                    TYPE_OPTIONS,
                    settings.defaultType,
                    'Default download type',
                    (nextType) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        defaultType: nextType,
                        defaultFormat:
                          nextType === 'video'
                            ? prev.defaultVideoFormat
                            : prev.defaultAudioFormat,
                      }))
                  )}
                </div>

                {/* Per-Type Extension & Video Resolution Defaults */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <div className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Audio Extension
                    </div>
                    <PrecisionSelect<AudioFormat>
                      value={settings.defaultAudioFormat}
                      options={AUDIO_FORMAT_OPTIONS}
                      onChange={(fmt) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          defaultAudioFormat: fmt,
                          defaultFormat:
                            prev.defaultType === 'audio' ? fmt : prev.defaultFormat,
                        }))
                      }
                      ariaLabel="Default audio extension"
                      triggerClassName="w-full"
                      menuClassName="min-w-[15rem]"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Video Extension
                    </div>
                    <PrecisionSelect<VideoFormat>
                      value={settings.defaultVideoFormat}
                      options={VIDEO_FORMAT_OPTIONS}
                      onChange={(fmt) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          defaultVideoFormat: fmt,
                          defaultFormat:
                            prev.defaultType === 'video' ? fmt : prev.defaultFormat,
                        }))
                      }
                      ariaLabel="Default video extension"
                      triggerClassName="w-full"
                      menuClassName="min-w-[15rem]"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Video Resolution
                    </div>
                    <PrecisionSelect<VideoResolution>
                      value={settings.defaultVideoResolution}
                      options={VIDEO_RESOLUTION_OPTIONS}
                      onChange={(res) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          defaultVideoResolution: res,
                        }))
                      }
                      ariaLabel="Default video resolution"
                      triggerClassName="w-full"
                      menuClassName="min-w-[14.5rem]"
                      align="right"
                    />
                  </div>
                </div>
              </div>

              {/* Embed Cover Art */}
              <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5">
                <div>
                  <div className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    Embed Cover Art
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Attach video thumbnail as album art on supported audio formats (MP3, OGG, AAC, FLAC).
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.embedThumbnail}
                  aria-label="Embed cover art"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      embedThumbnail: !prev.embedThumbnail,
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                    settings.embedThumbnail
                      ? 'bg-[var(--accent)]'
                      : 'bg-[var(--border-strong)]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-150 ${
                      settings.embedThumbnail
                        ? 'translate-x-[1.125rem] bg-[var(--accent-fg)]'
                        : 'translate-x-[0.1875rem] bg-white'
                    }`}
                  />
                </button>
              </div>

              {/* Output Directory */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
                <div className="mb-2.5">
                  <h3 className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    Output Directory
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Destination folder where completed audio and video files are saved.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    className="font-mono-tabular flex h-9 min-w-0 flex-1 items-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3 text-xs text-[var(--text-secondary)]"
                    title={settings.outputDir || 'Default Downloads folder'}
                  >
                    <span className="truncate">
                      {settings.outputDir || 'Default Downloads folder'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onChangeOutputDir}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-3.5 text-[0.8125rem] font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
                  >
                    <FolderSearch className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                    <span>Choose Folder</span>
                  </button>
                </div>
              </div>

              {/* Browser Cookies for Authenticated Sources */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    Browser Cookies
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Pass session cookies to yt-dlp for Facebook, Instagram, X, or age-restricted links.
                  </p>
                </div>
                <PrecisionSelect<BrowserCookies>
                  value={settings.cookiesBrowser}
                  options={BROWSER_COOKIE_OPTIONS}
                  onChange={(cookiesBrowser) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      cookiesBrowser,
                    }))
                  }
                  ariaLabel="Browser cookies source"
                  triggerClassName="min-w-[12rem]"
                  menuClassName="min-w-[16rem]"
                  align="right"
                />
              </div>

              {/* Max Concurrent Downloads */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                      Max Concurrent Downloads
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Saved immediately; takes effect after restarting the application.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Maximum concurrent downloads"
                    className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] p-0.5"
                  >
                    {CONCURRENT_OPTIONS.map((count) => {
                      const active = settings.maxConcurrent === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            onUpdateSettings((prev) => ({
                              ...prev,
                              maxConcurrent: count,
                            }))
                          }
                          className={`font-mono-tabular inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                            active
                              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-3.5">
          <button
            type="button"
            onClick={onResetDefaults}
            title="Reset appearance settings to factory defaults"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-transparent px-3 text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            <span>Reset Appearance</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-[0.8125rem] font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
