# Antigravity Account Manager

TUI app to manage OpenCode Antigravity Auth accounts. View rate limits, bulk enable/disable, delete, import/export accounts.

## Features

- View all accounts with rate limit status
- Bulk enable/disable accounts
- Delete selected accounts
- Export all or selected accounts to JSON
- Import from Antigravity Manager folder
- Import from JSON file

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Start TUI dashboard
node dist/cli.js

# Quick list accounts
node dist/cli.js list

# Export accounts
node dist/cli.js export -o backup.json

# Import from JSON file
node dist/cli.js import ./backup.json

# Import from AM folder
node dist/cli.js import-am
```

## Keyboard Shortcuts

### Normal Mode
| Key | Action |
|-----|--------|
| `R` | Refresh account list |
| `E` | Export all accounts to JSON |
| `I` | Import from file (shows CLI hint) |
| `A` | Import from Antigravity Manager |
| `S` | Enter Select Mode |
| `Q` | Quit |

### Select Mode
| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate up/down |
| `SPACE` | Toggle checkbox |
| `A` | Select all |
| `N` | Deselect all |
| `E` | Enable selected |
| `D` | Disable selected |
| `X` | Export selected only |
| `DEL` | Delete selected |
| `S` / `ESC` | Exit Select Mode |

## File Locations

| File | Path |
|------|------|
| Plugin accounts | `~/.config/opencode/antigravity-accounts.json` |
| AM accounts | `~/.antigravity_tools/` |

**Note:** OpenCode uses `~/.config/opencode/` on ALL platforms (including Windows).

## Security

- Export files contain refresh tokens - treat as sensitive
- Never commit export files to version control

## License

MIT
