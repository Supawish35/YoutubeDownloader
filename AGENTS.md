# Agent Instructions

## Package Manager
- Frontend: `npm` (`npm install`, `npm run dev`, `npm run build`)
- Backend: `cargo` in `src-tauri/` (`cargo check`, `cargo build`, `cargo test`)

## File-Scoped Commands
| Task | Command |
|------|---------|
| TypeScript Typecheck | `npx tsc --noEmit` |
| Rust Unit Test | `cargo test --manifest-path src-tauri/Cargo.toml <test_name>` |
| Rust Check | `cargo check --manifest-path src-tauri/Cargo.toml` |
| Frontend Build | `npm run build` |

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Gemini 4 Argon <noreply@google.com>
```

## Key Conventions
- **Path Aliases:** `@/` (`src/*`), `~types/` (`src/types/*`), `~components/` (`src/components/*`), `~features/` (`src/features/*`).
- **Components:** `React.FC<Props>` with typed props; heavy views use `React.lazy` wrapped in `<SuspenseLoader>`.
- **Tauri IPC:** Place all invoke and event wrappers in `src/lib/tauri.ts`.
- **Design Tokens:** Strict adherence to design tokens and color roles specified in `DESIGN.md`.
