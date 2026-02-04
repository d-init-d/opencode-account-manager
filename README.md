# Antigravity Account Manager for OpenCode

Desktop app + TUI tools to manage OpenCode Antigravity Auth accounts. Includes bulk enable/disable, import/export, rate limit status, and Antigravity Manager compatibility.

## Highlights

- **Desktop App (Tauri)** with mouse-first UI
- **Light / Dark / Auto** theme
- **Bilingual UI** (Vietnamese + English)
- **System Tray** enabled by default (user can turn off)
- **Bulk actions**: enable/disable multiple accounts
- **Import** from AM folder, plugin file, or portable export
- **Export** to portable JSON

---

## Desktop App (Recommended)

### Prerequisites
- Node.js 18+
- Rust (already installed on your machine)
- Windows: WebView2 Runtime (usually pre-installed)

### Run in dev mode

```bash
cd desktop
npm install
npm run tauri dev
```

### Build installer

```bash
cd desktop
npm run tauri build
```

### Desktop UI Features
- Clickable table with checkboxes
- Bulk enable/disable with confirm dialog
- Search and status filters
- Import/Export dialogs
- Settings: theme, language, system tray

---

## TUI Dashboard (Legacy)

```bash
npm install
npm run build
node dist/cli.js
```

### Normal Mode Keys
| Key | Action |
|-----|--------|
| `R` | Refresh account list |
| `E` | Export accounts to JSON |
| `I` | Import from file (shows CLI hint) |
| `A` | Import from Antigravity Manager |
| `S` | Enter Select Mode |
| `Q` | Quit |

### Select Mode Keys
| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate up/down |
| `SPACE` | Toggle checkbox for current account |
| `A` | Select all accounts |
| `N` | Deselect all accounts |
| `E` | Enable selected accounts |
| `D` | Disable selected accounts |
| `S` / `ESC` | Exit Select Mode |

---

## CLI Commands

```bash
# Show dashboard (default)
node dist/cli.js

# List accounts
node dist/cli.js list

# Export accounts
node dist/cli.js export -o backup.json

# Import from JSON file
node dist/cli.js import ./backup.json

# Import from AM folder
node dist/cli.js import ~/.antigravity_tools
# or
node dist/cli.js import-am

# Replace mode (overwrites all accounts)
node dist/cli.js import ./backup.json --mode replace
```

---

## Supported Import Formats

| Format | Description |
|--------|-------------|
| **AM Folder** | `~/.antigravity_tools/` - Reads `accounts.json` + detail files |
| **Plugin File** | `antigravity-accounts.json` from OpenCode plugin |
| **Portable Export** | JSON exported by this tool |

---

## File Locations

| File | Path |
|------|------|
| Plugin accounts | `~/.config/opencode/antigravity-accounts.json` |
| AM accounts | `~/.antigravity_tools/` |
| Backups | Current directory (`antigravity-export-*.json`) |

**Note:** OpenCode plugin uses `~/.config/opencode/` on ALL platforms (including Windows).

---

## OpenCode Plugin (Optional)

This repo includes an OpenCode plugin for managing accounts directly in chat:

```bash
# Copy plugin to OpenCode
cp plugin/antigravity-sync.ts ~/.config/opencode/plugins/
```

Tools:
- `account-list` - List accounts with status
- `account-status` - Summary statistics
- `account-export` - Export to JSON
- `account-import` - Import from JSON

---

## Security Notes

- Export files contain refresh tokens - treat as sensitive
- Never commit export files to version control
- AM import is read-only (does not modify AM data)

---

## License

MIT
