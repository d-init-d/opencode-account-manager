# OpenCode Account Manager

TUI Dashboard for [OpenCode](https://opencode.ai) - View and manage all your providers, MCP servers, and plugin accounts in one place.

## Features

### Dashboard
- **Providers Overview**: See all configured AI providers (Google, Ollama, Claudible, etc.) with model counts
- **MCP Servers Status**: View all MCP servers with enabled/disabled status
- **Plugin Accounts**: Manage Antigravity Auth plugin accounts
  - View rate limit status per model (claude, gemini, etc.)
  - Enable/Disable accounts
  - Delete accounts

### Export/Import (v0.4.0)
- **Encrypted Export (.ocam)**: Password-protected AES-256-GCM encryption
- **Plain JSON Export**: Backward compatible unencrypted format
- **File Browser**: Quick locations, folder navigation, paste path
- **Import with Preview**: See which accounts exist before importing
- **Overwrite Mode**: Existing accounts are updated on import

## Installation

```bash
# Clone the repo
git clone https://github.com/d-init-d/opencode-account-manager.git
cd opencode-account-manager

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

## Usage

```bash
# Run dashboard
ocam dashboard
# or
opencode-account-manager dashboard
# or
npm run dashboard
```

## Keyboard Shortcuts

### Main Dashboard
| Key | Action |
|-----|--------|
| `Tab` | Switch between sections (Providers → Accounts → MCP) |
| `R` | Refresh all data |
| `E` | Export accounts (opens format selection) |
| `I` | Import accounts (opens file browser) |
| `A` | Import from Antigravity Manager folder |
| `S` | Toggle select mode (in Accounts section) |
| `Q` | Quit |

### Select Mode (Accounts)
| Key | Action |
|-----|--------|
| `↑/↓` | Navigate accounts |
| `Space` | Toggle account selection |
| `A` | Select all accounts |
| `N` | Select none |
| `E` | Enable selected accounts |
| `D` | Disable selected accounts |
| `X` | Export selected accounts |
| `DEL` | Delete selected accounts |
| `S` / `Esc` | Exit select mode |

### Export Flow
1. Press `E` to export
2. Choose format: `[1] Encrypted (.ocam)` or `[2] Plain JSON`
3. Select destination folder
4. Enter password (for encrypted only)
5. Done!

### Import Flow
1. Press `I` to import
2. Browse and select `.ocam` or `.json` file
3. Enter password (for encrypted files)
4. Preview accounts to import
5. Press `Enter` to confirm

## File Formats

### Encrypted (.ocam)
- AES-256-GCM encryption with scrypt key derivation
- Password required to decrypt
- Recommended for sharing/backup

### Plain JSON
- Human-readable format
- Contains refresh tokens in clear text
- Use only for local backups

## Configuration Files

| File | Location | Description |
|------|----------|-------------|
| `opencode.json` | `~/.config/opencode/` | Main OpenCode config (providers, MCP) |
| `antigravity-accounts.json` | `%APPDATA%/opencode/` | Plugin accounts (Windows) |
| `ocam-config.json` | `%APPDATA%/opencode/` | App preferences (recent folders) |

## Documentation

- [ROADMAP.md](./docs/ROADMAP.md) - Version history and future plans
- [BLUEPRINT.md](./docs/BLUEPRINT.md) - Technical architecture

## Screenshots

```
* OpenCode Account Manager - Dashboard
────────────────────────────────────────────────────────────────
Providers  Models  MCP On  MCP Off  Accounts  Available  Limited
    4        29       6        0        5          3         2

Sections: [1] Providers  [2] Accounts  [3] MCP  (Tab to switch)

╭─ PROVIDERS ──────────────────────────────────────────────────╮
│ PROVIDER            MODELS  TYPE      BASE URL              │
│ Google              7       builtin   -                     │
│ Ollama              5       custom    http://localhost:11434│
│ Claudible           3       custom    https://claudible.io  │
│ Antigravity Manager 14      custom    http://localhost:8045 │
╰──────────────────────────────────────────────────────────────╯
```

## License

MIT
