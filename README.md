# YoutubeDownloader v2.0.0

A cross-platform desktop YouTube audio and video downloader built with **Rust**, **Tauri v2**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

## Key Features

- **Cross-Platform Desktop App:** Native Linux, Windows, and macOS desktop window powered by Tauri v2 (`860x660` default, resizable).
- **Audio & Video Formats:**
  - **Audio Extraction:** `.MP3`, `.OGG` (`vorbis`), `.AAC` (`m4a`), `.FLAC`, and `.WAV` at highest audio quality (`--audio-quality 0`).
  - **Video Download:** `.MP4` (`bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best` merged to `.mp4`).
- **Metadata & Cover Art Embedding:** Automatically embeds track metadata (`--embed-metadata`) and optionally embeds video thumbnails as JPG cover art (`--embed-thumbnail --convert-thumbnails jpg`).
- **Hybrid `yt-dlp` + `ffmpeg` Binary Manager:**
  - Automatically checks managed binaries in the Tauri `app_data_dir/bin/` directory and falls back to system `PATH`.
  - Auto-provisions `yt-dlp` on startup if missing, and supports one-click self-updates (`yt-dlp -U` or latest GitHub release download).
- **Bounded Concurrent Download Queue:**
  - `DownloadManager` backed by a `tokio::sync::Semaphore` (`maxConcurrent = 3` by default) with per-job cancellation via `tokio::sync::watch`.
  - Queue filter tabs (`All`, `Active`, `Completed`, `Failed`), batch controls (**Download All Queued**, **Clear Completed**, **Clear All**), and per-item **Start**, **Cancel**, **Retry**, **Open Folder**, and **Remove** actions.
- **Real-Time Progress & Telemetry:** Live progress bars, transfer speed, and ETA streamed from Rust stdout parsing over Tauri `download-progress` and `binary-status` events.
- **Dark / Light Mode & Persistent Settings:** Theme, output directory, default format, thumbnail embedding preference, and concurrency settings are persisted to `settings.json`.
- **Release Update Checker:** Checks `https://api.github.com/repos/Supawish35/YoutubeDownloader/releases/latest` and links directly to new releases.

## Architecture & Project Structure

```text
+-----------------------------------------------------------------------+
|  Frontend (React 19 + TypeScript + Tailwind CSS v4)                   |
|  - App.tsx, Header, ControlPanel, QueueList (lazy), AboutModal (lazy) |
|  - src/lib/tauri.ts (typed invoke wrappers + event listeners)         |
+-----------------------------------+-----------------------------------+
                                    | Tauri v2 IPC & Events
                                    | (`download-progress`, `binary-status`)
+-----------------------------------v-----------------------------------+
|  Backend (Rust + Tokio + Tauri v2)                                    |
|  - lib.rs: Tauri commands & AppState                                  |
|  - downloader.rs: URL validation, DownloadManager (Semaphore=3)       |
|  - binaries.rs: hybrid yt-dlp / ffmpeg detection & provisioning       |
|  - settings.rs: JSON settings persistence in app_data_dir             |
|  - updater.rs: GitHub release version checker                         |
+-----------------------------------------------------------------------+
```

### Directory Layout

```text
YoutubeDownloader/
├── src/
│   ├── components/
│   │   ├── AboutModal.tsx      # App version, license, repo & binary diagnostics (lazy)
│   │   ├── ControlPanel.tsx    # URL input, format pills, embed-thumbnail & folder bar
│   │   ├── Header.tsx          # Brand title, binary status pill, updates & theme toggle
│   │   ├── QueueItemCard.tsx   # Per-job thumbnail, live progress bar, speed/ETA & actions
│   │   ├── QueueList.tsx       # Filter tabs, batch controls & empty state (lazy)
│   │   └── SuspenseLoader.tsx  # React.Suspense skeleton fallback
│   ├── lib/
│   │   └── tauri.ts            # Typed Tauri invoke/event wrappers + browser preview mode
│   ├── types/
│   │   └── downloader.ts       # Shared TypeScript interfaces matching Rust models
│   ├── App.tsx                 # Root state, Tauri event listeners & settings sync
│   ├── main.tsx                # React 19 mount entry point
│   └── index.css               # Tailwind v4 configuration & theme tokens
└── src-tauri/
    ├── capabilities/
    │   └── default.json        # Tauri v2 permissions (core, dialog, opener)
    ├── src/
    │   ├── binaries.rs         # yt-dlp & ffmpeg resolution, download & update
    │   ├── downloader.rs       # URL validation, yt-dlp args, DownloadManager
    │   ├── lib.rs              # Tauri command handlers & state setup
    │   ├── main.rs             # Desktop binary entry point
    │   ├── models.rs           # Serde camelCase models & enums
    │   ├── settings.rs         # Settings load/save persistence
    │   └── updater.rs          # GitHub latest release check
    ├── Cargo.toml
    └── tauri.conf.json
```

## Development & Build Instructions

### Prerequisites

- **Node.js** (v18+) & **npm**
- **Rust** toolchain (`rustup`, `cargo`) and Tauri v2 system prerequisites
- **`ffmpeg`** on system `PATH` (for audio extraction, muxing, and thumbnail embedding)

### Commands

```bash
# Install frontend dependencies
npm install

# Run the desktop application in development mode (Vite + Tauri)
npm run tauri dev

# Typecheck and build the frontend bundle
npx tsc --noEmit
npm run build

# Run Rust backend check and unit tests
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml

# Build production desktop installers/bundles
npm run tauri build
```

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for details.

Author: **Supawish35** — [GitHub Repository](https://github.com/Supawish35/YoutubeDownloader)
