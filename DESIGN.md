# Design System: YoutubeDownloader
**Project ID:** supawish35-youtube-downloader-v2

## 1. Visual Theme & Atmosphere
YoutubeDownloader embodies a modern, focused, desktop utility aesthetic engineered for high-performance audio/video extraction. The visual atmosphere balances precision engineering with tactile responsiveness:
* **Atmosphere:** Clean, dark-first desktop utility with an air of refined, distraction-free efficiency. Interfaces feel snappy and purposeful without visual bloat.
* **Lighting & Elevation:** Layers use subtle luminance elevation rather than heavy blurred drop shadows. Dark mode utilizes Deep Midnight Slate (`#0F172A`) as a deep base foundation with Elevated Obsidian Surface (`#1E293B`) floating gently above with whisper-thin 1px borders.
* **Transitions:** Micro-interactions employ snappy 150ms to 300ms cubic-bezier easing (`cubic-bezier(0.4, 0, 0.2, 1)`) for hover, active pressed, and layout expansion states.
* **Accessibility:** Strict adherence to WCAG 2.1 AA guidelines with a minimum 4.5:1 text-to-background contrast ratio across both light and dark display modes.
* **Iconography:** Pure SVG-only iconography powered by Lucide React (`lucide-react`) with 1.5px to 2px stroke weights. Structural emojis are strictly prohibited in the UI hierarchy.

## 2. Color Palette & Roles
* **Deep Midnight Slate (`#0F172A`):** Primary canvas background in dark mode, grounding the interface with deep slate depth.
* **Elevated Obsidian Surface (`#1E293B`):** Elevated container surface in dark mode for download queue cards, control panels, settings panels, and modal containers.
* **Crisp Alabaster (`#F8FAFC`):** Primary canvas background in light mode, delivering clean, airy contrast.
* **Pure Snow Surface (`#FFFFFF`):** Elevated card surface in light mode, and crisp primary text when overlaid on dark accents or vibrant button fills.
* **Electric Rose-Crimson (`#EC4899`):** Primary brand accent, active audio/video format selector pill, and primary call-to-action button fill.
* **Deep Berry Magenta (`#DB2777`):** Hover and pressed interactive states for primary buttons, and starting color stop for active download progress bar gradients.
* **Timeline Cobalt Blue (`#2563EB`):** Secondary action accent, trailing gradient stop for active progress bars, and metadata pill badge background.
* **Emerald Signal (`#10B981`):** Success indicator badge for completed downloads and ready/verified binary status (yt-dlp and ffmpeg).
* **Amber Pulse (`#F59E0B`):** Transcoding, audio extraction, muxing, and active binary provisioning/download status indicators.
* **Crimson Alert (`#DC2626`):** Error banners, failed download retry badges, and destructive cancel/remove actions.
* **Muted Slate Mist (`#94A3B8`):** Secondary and tertiary text labels, including video duration, channel names, download throughput speed, and remaining ETA.
* **Translucent Dark Border (`rgba(255, 255, 255, 0.08)`):** Subtle 1px dividing border for cards and panels in dark mode.
* **Subtle Slate Border (`#E2E8F0`):** Crisp 1px dividing border for cards and panels in light mode.

## 3. Typography Rules
* **Primary Interface Font:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif. Used for window headers, action labels, tab navigation, and descriptive body copy.
  * *Window & Section Headers:* Semi-bold (`font-weight: 600`), 16px to 20px, tight tracking (`-0.02em`).
  * *Card Titles & Video Headlines:* Medium to Semi-bold (`font-weight: 500` to `600`), 14px to 15px, line-clamp 2.
  * *Button & Pill Labels:* Medium (`font-weight: 500`), 13px to 14px, tracking normal.
  * *General Body & Tooltips:* Regular (`font-weight: 400`), 13px, line-height 1.5.
* **Technical & Metric Font:** `JetBrains Mono`, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace. Used exclusively for numerical data, bitrates, resolutions, throughput speeds (`MB/s`), time elapsed/ETA counters, and binary diagnostic logs.
  * *Metrics & Status Timers:* Regular to Medium (`font-weight: 400` or `500`), 12px to 13px, tabular numbers (`font-variant-numeric: tabular-nums`).

## 4. Component Stylings
* **Buttons:**
  * *Primary Action Button (Download/Start):* Generously curved corners (`rounded-lg`, 8px radius) or pill-shaped (`rounded-full`), filled with Electric Rose-Crimson (`#EC4899`), transitioning to Deep Berry Magenta (`#DB2777`) on hover over 150ms. High contrast Pure Snow (`#FFFFFF`) bold label with accompanying Lucide SVG icon.
  * *Secondary Actions (Open Folder, Clear Queue):* Outlined button with 1px translucent border (`rgba(255, 255, 255, 0.08)` or `#E2E8F0`), ghost background transitioning to Elevated Obsidian (`#1E293B`) or Crisp Alabaster (`#F8FAFC`) on hover.
  * *Format Selection Pills:* Seamless pill-shaped containers (`rounded-full`, 9999px radius). Inactive state features subtle translucent background with Muted Slate Mist (`#94A3B8`) text. Active selected state snaps into vibrant Electric Rose-Crimson (`#EC4899`) or Timeline Cobalt Blue (`#2563EB`) with crisp Pure Snow text.
  * *Icon Utility Buttons:* Compact circular or square (`rounded-lg`), 32x32px or 36x36px target size, centered Lucide SVG icon, accessible tooltip on hover.
* **Cards/Containers:**
  * *Queue Item Cards:* Generously rounded corners (`rounded-xl`, 12px radius). Dark mode surface uses Elevated Obsidian Surface (`#1E293B`) with a crisp 1px border (`rgba(255, 255, 255, 0.08)`). Light mode surface uses Pure Snow Surface (`#FFFFFF`) with border (`#E2E8F0`).
  * *Progress Indicators:* Sleek horizontal track (height 6px to 8px, `rounded-full`) embedded within each download card. Active state displays a glowing gradient running from Deep Berry Magenta (`#DB2777`) to Timeline Cobalt Blue (`#2563EB`). Completed state turns Emerald Signal (`#10B981`). Error state turns Crimson Alert (`#DC2626`).
  * *Elevation & Shadows:* Flat to subtle diffused elevation (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`). Hovering cards elevates them slightly with subtle border brighten.
* **Inputs/Forms:**
  * *URL Paste Input Bar:* Full-width input with generous height (44px to 48px), pill or rounded rectangle geometry (`rounded-xl`), inset padding with leading search/link Lucide icon.
  * *Input Border & Surface:* Subtle 1px border (`rgba(255, 255, 255, 0.12)` dark, `#CBD5E1` light). In dark mode, background rests on Deep Midnight Slate (`#0F172A`) or deep Obsidian inset.
  * *Focus State:* Vibrant focus ring glowing with Timeline Cobalt Blue (`#2563EB`) or Electric Rose-Crimson (`#EC4899`) with zero outline offset (2px ring).
  * *Quality & Codec Dropdowns:* Styled select triggers with matching 1px border, rounded-lg geometry, and custom Lucide chevron indicators.

## 5. Layout Principles
* **Structure & Proportions:** Single-window desktop workspace with clear vertical partitioning:
  1. *Top Bar / Ingestion Header:* URL paste input, format toggle pills (MP3, MP4, FLAC, WAV, AAC), and instant download CTA.
  2. *Status & Action Toolbar:* Active queue counter, filter pills (All, Active, Completed, Failed), speed throttle toggle, and directory selection trigger.
  3. *Main Download Queue:* Vertically scrollable feed of card components with generous 12px (`gap-3`) spacing. Empty state displays an illustrated placeholder and drop guidance.
  4. *Bottom Utility Bar:* Provisioning status for background binaries (`yt-dlp`, `ffmpeg`), active overall network throughput, and quick links to storage folder.
* **Spacing Scale:** Standard 4px baseline grid. Micro spacing 4px (`p-1`) to 8px (`p-2`), component padding 12px (`p-3`) to 16px (`p-4`), section margins 20px (`p-5`) to 24px (`p-6`).
* **Grid & Alignment:** Consistent alignment along horizontal axes with items vertically centered (`items-center`). Numerical metrics align right with tabular mono fonts for jitter-free real-time updates.
