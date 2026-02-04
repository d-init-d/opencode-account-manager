# Antigravity Account Manager

TUI Dashboard for managing OpenCode Antigravity Auth accounts. View status, import/export, and bulk enable/disable accounts without leaving your terminal.

## Features

- **TUI Dashboard** - Visual interface in terminal
- **Multi-Select Mode** - Bulk enable/disable accounts like Antigravity Manager
- **Import from AM** - Import accounts from Antigravity Manager (`~/.antigravity_tools/`)
- **Import from File** - Import from JSON export files
- **Export** - Backup accounts to portable JSON
- **Rate Limit Status** - See which accounts are limited and when they reset

## Install

```bash
git clone https://github.com/d-init-d/opencode-account-sync.git
cd opencode-account-sync
npm install
npm run build
```

## Usage

### TUI Dashboard

```bash
node dist/cli.js
# or
npm run dashboard
```

### Normal Mode Keys

| Key | Action |
|-----|--------|
| `R` | Refresh account list |
| `E` | Export accounts to JSON |
| `I` | Import from file (shows CLI hint) |
| `A` | Import from Antigravity Manager |
| `S` | **Enter Select Mode** |
| `Q` | Quit |

### Select Mode Keys (for bulk operations)

Press `S` to enter Select Mode, then:

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate up/down |
| `SPACE` | Toggle checkbox for current account |
| `A` | Select all accounts |
| `N` | Deselect all accounts |
| `E` | **Enable** all selected accounts |
| `D` | **Disable** all selected accounts |
| `S` / `ESC` | Exit Select Mode |

### CLI Commands

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

## Supported Import Formats

| Format | Description |
|--------|-------------|
| **AM Folder** | `~/.antigravity_tools/` - Reads `accounts.json` + detail files |
| **Plugin File** | `antigravity-accounts.json` from OpenCode plugin |
| **Portable Export** | JSON exported by this tool |

## File Locations

| File | Path |
|------|------|
| Plugin accounts | `~/.config/opencode/antigravity-accounts.json` |
| AM accounts | `~/.antigravity_tools/` |
| Backups | Current directory (`antigravity-export-*.json`) |

**Note:** Plugin uses `~/.config/opencode/` on ALL platforms (including Windows).

## Account States

| Status | Icon | Description |
|--------|------|-------------|
| Available | `● AVAILABLE` | Ready to use |
| Limited | `○ LIMITED` | Rate limited, shows reset time |
| Disabled | `x DISABLED` | Manually disabled, won't be used |

## OpenCode Plugin

This repo also includes an OpenCode plugin for managing accounts directly in chat:

```bash
# Copy plugin to OpenCode
cp plugin/antigravity-sync.ts ~/.config/opencode/plugins/
```

Plugin provides these tools callable by AI:
- `account-list` - List accounts with status
- `account-status` - Summary statistics
- `account-export` - Export to JSON
- `account-import` - Import from JSON

## Security Notes

- Export files contain refresh tokens - treat as sensitive
- Never commit export files to version control
- AM import is read-only (does not modify AM data)

## License

MIT
