# Design System: YoutubeDownloader
**Project ID:** supawish35-youtube-downloader-v2

## 1. Visual Theme & Atmosphere
YoutubeDownloader embodies a **Precision Audio/Hardware Utility** aesthetic engineered for high-performance media extraction inside a focused desktop workbench (`1040×760` default Tauri window).
* **Atmosphere:** Tactile, distraction-free studio instrument inspired by Braun / Teenage Engineering / native desktop utilities. Zero decorative gradients, zero floating SaaS cards, and zero visual bloat.
* **Partitioning & Elevation:** An edge-to-edge workbench (`h-screen flex flex-col overflow-hidden`) partitioned strictly by crisp `1px` structural hairlines rather than drop shadows or card-in-card nesting. Modals use a subtle crisp border with restrained elevation.
* **Transitions:** Snappy `150ms` cubic-bezier easing (`cubic-bezier(0.2, 0, 0, 1)`) for hover, active, and toggle states, respecting `prefers-reduced-motion`.
* **Accessibility:** Minimum 4.5:1 text-to-background contrast across both light and dark modes, clear keyboard `focus-visible` outlines (`--ring-focus`), and semantic ARIA roles.
* **Iconography:** Pure SVG iconography powered by Lucide React (`lucide-react`) with consistent `1.5px` stroke weight (`strokeWidth={1.5}` or `1.75` for small glyphs). Structural emojis and decorative gradient icon boxes are strictly prohibited.

## 2. Color Palette & Surface Tokens

### Theme Modes (`system` | `dark` | `light`)
Theme resolution toggles the `.dark` class on `<html>` (`document.documentElement`):
* **`dark` (default):** Forces `html.dark` (Matte Neutral Charcoal).
* **`light`:** Uses `:root` tokens (Warm Paper & Crisp Stone).
* **`system`:** Tracks `window.matchMedia('(prefers-color-scheme: dark)')` dynamically and syncs `html.dark` automatically.

### Surface, Border, Text & Semantic Tokens
| Token | Light Mode (`:root`) | Dark Mode (`html.dark`) | Role |
|---|---|---|---|
| `--bg-canvas` | `#F4F3EF` | `#111113` | Primary application background |
| `--bg-panel` | `#FFFFFF` | `#18181B` | Command bar, intake deck, telemetry footer, modals |
| `--bg-elevated` | `#FAFAF8` | `#202024` | Raised surface for active segments & popovers |
| `--bg-inset` | `#EAE8E2` | `#0B0B0D` | Input wells, segmented tracks, progress tracks, thumbnail slots |
| `--bg-hover` | `rgba(20, 20, 22, 0.04)` | `rgba(255, 255, 255, 0.04)` | Subtle interactive row/control hover fill |
| `--border-hairline` | `#DEDCD5` | `rgba(255, 255, 255, 0.09)` | `1px` structural dividers |
| `--border-strong` | `#C2BFB5` | `rgba(255, 255, 255, 0.17)` | Hover/active borders and modal framing |
| `--text-primary` | `#141416` | `#F4F4F5` | Primary titles, labels, values |
| `--text-secondary` | `#52525B` | `#A1A1AA` | Metadata, secondary actions |
| `--text-muted` | `#676770` | `#86868F` | Captions, placeholders, subtle telemetry (WCAG AA compliant) |
| `--status-ok` | `#16A34A` | `#22C55E` | Completed downloads, verified `yt-dlp` / `ffmpeg` |
| `--status-warn` | `#D97706` | `#F59E0B` | Metadata resolution, transcoding/muxing, missing `ffmpeg` |
| `--status-err` | `#DC2626` | `#EF4444` | Failed downloads, missing `yt-dlp`, destructive actions |
| `--ring-focus` | `var(--accent)` | `var(--accent)` | Keyboard `focus-visible` indicator |

## 3. Accent Customization (`html[data-accent="..."]`)
The signal accent is controlled via `data-accent` on `<html>` (default: `vermilion`). Every preset defines five semantic accent tokens so components never hardcode hex values:
* `--accent`: Primary CTA button fill, active format segment, active download progress bar, text selection background.
* `--accent-hover`: Hover state fill for `--accent` controls.
* `--accent-fg`: Foreground text/icon color rendered **on** `--accent` (`#FFFFFF` on colored presets and light-mode `monochrome`; `#111113` on dark-mode `monochrome`).
* `--accent-text`: WCAG AA compliant accent text/icon color rendered on neutral `--bg-canvas` / `--bg-panel` / `--bg-inset` surfaces.
* `--accent-subtle`: Soft `10%`–`12%` tinted background for active filter pills, badges, and status callouts.

| Preset (`data-accent`) | `--accent` (Light / Dark) | `--accent-hover` (Light / Dark) | `--accent-fg` (Light / Dark) | `--accent-text` (Light / Dark) | `--accent-subtle` (Light / Dark) |
|---|---|---|---|---|---|
| **`vermilion`** *(default)* | `#EA580C` / `#EA580C` | `#C2410C` / `#C2410C` | `#FFFFFF` / `#FFFFFF` | `#C2410C` / `#FB923C` | `rgba(234, 88, 12, 0.10)` / `0.12` |
| **`crimson`** | `#DC2626` / `#DC2626` | `#B91C1C` / `#B91C1C` | `#FFFFFF` / `#FFFFFF` | `#B91C1C` / `#F87171` | `rgba(220, 38, 38, 0.10)` / `0.12` |
| **`cobalt`** | `#2563EB` / `#2563EB` | `#1D4ED8` / `#1D4ED8` | `#FFFFFF` / `#FFFFFF` | `#1D4ED8` / `#60A5FA` | `rgba(37, 99, 235, 0.10)` / `0.12` |
| **`emerald`** | `#16A34A` / `#16A34A` | `#15803D` / `#15803D` | `#FFFFFF` / `#FFFFFF` | `#15803D` / `#4ADE80` | `rgba(22, 163, 74, 0.10)` / `0.12` |
| **`amber`** | `#D97706` / `#D97706` | `#B45309` / `#B45309` | `#FFFFFF` / `#FFFFFF` | `#B45309` / `#FBBF24` | `rgba(217, 119, 6, 0.10)` / `0.12` |
| **`monochrome`** | `#18181B` / `#F4F4F5` | `#27272A` / `#E4E4E7` | `#FFFFFF` / `#111113` | `#141416` / `#F4F4F5` | `rgba(24, 24, 27, 0.10)` / `rgba(244, 244, 245, 0.11)` |

## 4. Typography & Scale (`html[data-scale="..."]`)
* **Primary Interface Font (`--font-sans`):** `"IBM Plex Sans"`, system-ui, -apple-system, BlinkMacSystemFont, `"Segoe UI"`, sans-serif. Typography, button heights, spacing, and row dimensions use `rem` units so the entire interface scales proportionally with `html` root `font-size`.
  * *App Wordmark:* Semi-bold (`600`), `text-base` (`1rem`, `17px` at default `md`), tight tracking (`-0.015em`).
  * *Track / Queue Item Titles:* Medium (`500`), `text-sm` (`0.875rem`), single-line truncated (`truncate`).
  * *Controls & Labels:* Medium (`500`), `text-xs` (`0.75rem`) to `text-sm` (`0.875rem`).
  * *Secondary Metadata:* Regular (`400`), `text-xs` (`0.75rem`).
* **Technical & Metric Font (`--font-mono`, `.font-mono-tabular`):** `"JetBrains Mono"`, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace with `font-variant-numeric: tabular-nums`. Used for format codes (`.MP3`, `.MP4`), speeds, ETAs, percentages, file paths, versions, and queue counters so telemetry columns never jitter horizontally.
* **UI Size (`data-scale`):** Controlled via `html` root `font-size` across 5 proportional tiers (`85%`–`135%`):
  * `xs`: `font-size: 13.5px`, `--text-scale: 0.85` (`85%`)
  * `sm`: `font-size: 15px`, `--text-scale: 0.95` (`95%`)
  * `md` *(default)*: `font-size: 17px`, `--text-scale: 1.05` (`105%`)
  * `lg`: `font-size: 19px`, `--text-scale: 1.2` (`120%`)
  * `xl`: `font-size: 21.5px`, `--text-scale: 1.35` (`135%`)

## 5. Geometry, Density & Thumbnail Visibility

### Corner Geometry (`html[data-corners="..."]`)
| Token | `balanced` *(default)* | `sharp` | Usage |
|---|---|---|---|
| `--radius-sm` | `4px` | `2px` | Thumbnails, status badges, compact icon buttons, scrollbar thumb |
| `--radius-md` | `6px` | `2px` | Inputs, segmented rails, primary/secondary buttons, swatch cards |
| `--radius-lg` | `8px` | `3px` | Modal dialogs and floating toast containers |

### Queue Density (`html[data-density="..."]`)
| Token | `compact` | `comfortable` *(default)* | `spacious` | Usage |
|---|---|---|---|---|
| `--row-py` | `0.45rem` | `0.75rem` | `1.05rem` | Vertical padding of each `QueueItemCard` row |
| `--thumb-w` | `4.5rem` | `6rem` | `7.5rem` | Width of queue row thumbnail frame |
| `--thumb-h` | `2.5rem` | `3.375rem` | `4.25rem` | Height of queue row thumbnail frame (`16:9`) |

### Thumbnail Visibility (`showThumbnails`)
* Persisted boolean (`true` by default) passed from `AppSettings` through `QueueList` to `QueueItemCard`.
* When disabled, queue rows hide the thumbnail box completely so high-volume queues read like a pure precision telemetry ledger.

## 6. Component Stylings & Settings Modal
* **Separated Type Switch & Precision Format Popovers (`ControlPanel` + `PrecisionSelect`):**
  * Primary `Audio | Video` segmented switch in a `1px`-bordered inset rail (`var(--accent)` active fill with `var(--accent-fg)` text).
  * Contextual extension dropdown (`Audio`: `.MP3`, `.OGG`, `.M4A` (`AAC`), `.FLAC`, `.WAV`; `Video`: `.MP4`, `.MKV`, `.WEBM`) preserving each type's last chosen extension independently, with codec/container hints inside a custom Precision popover.
  * When `Video` is active, a paired `Res` Precision dropdown caps video quality (`Best`, `1080p`, `720p`, `480p`). `Cover Art` remains active for supported Audio formats (`MP3`, `OGG`, `AAC`, `FLAC`) and disables gracefully on `Video` and `WAV`.
* **Progress Track:** Horizontal `h-1` bar inside each queue row (`var(--accent)` during download, `var(--status-warn)` during metadata/converting, `var(--status-ok)` on completion, `var(--status-err)` on failure).
* **Settings Modal (`SettingsModal`, `max-w-2xl`):**
  * Opened via the Header `Settings` icon button or `Ctrl+,` (`Cmd+,` on macOS); `Esc` dismisses.
  * Two focused tabs:
    1. **Appearance:** Visual Theme Mode cards (`System` / `Dark` / `Light`), Accent Color swatches (`vermilion`, `crimson`, `cobalt`, `emerald`, `amber`, `monochrome`), Queue Density (`Compact` / `Comfortable` / `Spacious`), Corner Style (`Balanced` / `Sharp`), UI Size 5-step selector (`XS 85%` / `S 95%` / `M 105%` / `L 120%` / `XL 135%` with active percentage badge), `Show Queue Thumbnails` switch, and a non-interactive **Live Appearance Preview** row reflecting `--accent`, `--accent-fg`, `--radius-sm`, `--row-py`, and thumbnail visibility in real time.
    2. **Downloads:** Default Download Type (`Audio | Video`), Default Audio Extension, Default Video Extension, Default Video Resolution, Embed Cover Art toggle, Output Directory path + `Choose Folder` trigger, and Max Concurrent Downloads (`1`–`5`) stepper.
  * Footer includes a `Reset Defaults` ghost action on the left and a `Done` primary button (`bg-[var(--accent)] text-[var(--accent-fg)]`) on the right. All appearance preferences persist automatically via `AppSettings`.
* **Floating Toasts:** Anchored bottom-right (`fixed bottom-12 right-4 z-40`) above the telemetry bar using `rounded-[var(--radius-lg)]` so notifications never shift workspace layout.

## 7. Layout Principles
1. **Top Command Bar (`h-13`):** Wordmark + `v2.0.0` tag on left; compact `Updates`, `Settings (Ctrl+,)`, `Theme Toggle`, and `About` icon controls on right.
2. **Intake & Format Deck:** Full-bleed zone with URL input + `Download` / `Queue` buttons (`h-11`) on row 1, and `Audio | Video` switch + contextual Extension/Resolution Precision popovers + `Cover Art` switch + inline `Dest` directory strip (`h-9`) on row 2.
3. **Scrollable Queue Workspace (`flex-1 min-h-0`):** Hairline toolbar with filter tabs (`All`, `Active`, `Completed`, `Failed`) and batch actions above a `1px` hairline-divided track list (`QueueItemCard`) showing type icon, extension, and video resolution telemetry, or a quiet typographic empty state.
4. **Bottom Telemetry Bar:** Single source of truth for `yt-dlp` status/version + inline update/install action, `ffmpeg` indicator, `Active X/N` counter, and `Open Folder` shortcut.
