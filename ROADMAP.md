# Antigravity Account Manager for OpenCode - Desktop Roadmap

## Scope & Requirements
- Light / Dark / Auto theme
- Bilingual UI (Vietnamese + English)
- System tray enabled by default, user can turn off
- Auto-update: not required
- UI/UX must follow: `design-system/antigravity-account-manager-for-opencode/`

## Progress Rules
- After completing a phase, mark all tasks in that phase as done
- Always update this file before pushing to GitHub

---

## Phase 0 - Discovery & Design System (DONE)
- [x] Confirm product name: **Antigravity Account Manager for OpenCode**
- [x] Capture requirements (themes, i18n, tray, no auto-update)
- [x] Generate UI/UX design system (UI/UX Pro Max)
- [x] Persist design system to `design-system/antigravity-account-manager-for-opencode/`

---

## Phase 1 - Desktop App Scaffolding
- [x] Create `desktop/` app folder
- [x] Initialize Tauri + Vite + React
- [x] Set app metadata (name, window title)
- [x] Configure dev/build scripts
- [x] Add system tray scaffold (enabled by default)

---

## Phase 2 - Rust Backend Core
- [x] Read plugin accounts from `~/.config/opencode/antigravity-accounts.json`
- [x] Write plugin accounts with backup (keep last 5)
- [x] Import from AM folder (`~/.antigravity_tools/`)
- [x] Import from JSON (portable / plugin format)
- [x] Export to portable JSON
- [x] Settings store (theme, language, tray enabled)

---

## Phase 3 - Frontend UI (React)
- [x] Apply design system: colors, typography, spacing, focus states
- [x] Layout: sidebar + main table + detail panel
- [x] Account table with checkbox, status, reset time
- [x] Bulk actions (enable/disable)
- [x] Search + filter (available/limited/disabled)
- [x] Theme switcher (Light/Dark/Auto)
- [x] Language switcher (VI/EN)
- [x] Toasts / dialogs for import/export/confirm

---

## Phase 4 - Integration & UX Polish
- [x] Wire UI to Tauri commands
- [x] Confirm dialogs for destructive actions
- [x] Empty/loading/error states
- [x] A11y: focus rings, keyboard nav, ARIA
- [x] System tray option toggle + persistence

---

## Phase 5 - Docs & Release
- [x] Update README with Desktop App instructions
- [x] Add run/build steps for desktop
- [x] Push changes to GitHub
