# OpenCode Account Manager

TUI Dashboard for [OpenCode](https://opencode.ai) - View and manage all your providers, MCP servers, and plugin accounts in one place.

## Features

- **Providers Overview**: See all configured AI providers (Google, Ollama, Claudible, etc.) with model counts
- **MCP Servers Status**: View all MCP servers with enabled/disabled status
- **Plugin Accounts**: Manage Antigravity Auth plugin accounts
  - View rate limit status per model (claude, gemini, etc.)
  - Enable/Disable accounts
  - Delete accounts
  - Export/Import accounts
  - Import from Antigravity Manager folder

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

| Key | Action |
|-----|--------|
| `Tab` | Switch between sections (Providers → Accounts → MCP) |
| `R` | Refresh all data |
| `S` | Toggle select mode (in Accounts section) |
| `↑/↓` | Navigate accounts (in select mode) |
| `Space` | Toggle account selection |
| `A` | Select all accounts |
| `N` | Select none |
| `E` | Enable selected accounts |
| `D` | Disable selected accounts |
| `DEL` | Delete selected accounts |
| `X` | Export selected accounts |
| `Q` | Quit |

## Configuration Files

The app reads from these OpenCode configuration files:

| File | Location | Description |
|------|----------|-------------|
| `opencode.json` | `~/.config/opencode/` | Main OpenCode config (providers, MCP servers) |
| `antigravity-accounts.json` | `%APPDATA%/opencode/` | Plugin accounts (Windows) |

## Screenshots

```
* OpenCode Account Manager - Dashboard
────────────────────────────────────────────────────────────────
Providers  Models  MCP On  MCP Off  Accounts  Available  Limited
    4        29       6        0        5          3         2

Sections: [1] Providers  [2] Accounts  [3] MCP  (Tab to switch)

╭─ PROVIDERS ──────────────────────────────────────────────────╮
│ PROVIDER            MODELS  TYPE      BASE URL              │
│ Antigravity         7       builtin   -                     │
│ Ollama              5       custom    http://localhost:11434│
│ Claudible           3       custom    https://claudible.io  │
│ Antigravity Manager 14      custom    http://localhost:8045 │
╰──────────────────────────────────────────────────────────────╯

╭─ PLUGIN ACCOUNTS (opencode-antigravity-auth) ─ (collapsed) ─╮
╰──────────────────────────────────────────────────────────────╯

╭─ MCP SERVERS ─────────────────────────────── (collapsed) ───╮
╰──────────────────────────────────────────────────────────────╯
```

## License

MIT
