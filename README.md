# OpenCode Account Manager (OCAM)

[![npm version](https://img.shields.io/npm/v/opencode-account-manager.svg)](https://www.npmjs.com/package/opencode-account-manager)
[![npm downloads](https://img.shields.io/npm/dw/opencode-account-manager.svg)](https://www.npmjs.com/package/opencode-account-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/d-init-d/opencode-account-manager/blob/main/LICENSE)

TUI Dashboard to manage all providers, MCP servers, and plugin accounts for [OpenCode](https://opencode.ai).

---

## Features

- **Providers View**: See all AI providers (Google, Ollama, Antigravity) with model counts
- **MCP Servers**: View enabled/disabled status of MCP servers
- **Plugin Accounts**: Manage Antigravity Auth plugin accounts
  - Rate limit status per model (claude, gemini)
  - Enable/Disable/Delete accounts
- **Encrypted Export**: AES-256-GCM encryption with password protection
- **Multi-format Import**: Support for encrypted `.ocam`, plain JSON, and Antigravity Manager exports

---

## Installation

**For Humans**

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install opencode-account-manager globally via npm, then run "ocam" to verify installation.
Repository: https://github.com/d-init-d/opencode-account-manager
```

**Option B: Install from npm**

```bash
npm install -g opencode-account-manager
```

**Option C: Install from GitHub**

```bash
npm install -g github:d-init-d/opencode-account-manager
```

**Verify installation:**

```bash
ocam --version
```

---

**For LLM Agents**

### Step-by-Step Instructions

1. Run `npm install -g opencode-account-manager` to install globally
2. Run `ocam` to start the TUI dashboard
3. The dashboard will auto-detect OpenCode config at `~/.config/opencode/opencode.json`

### Verification

```bash
ocam --version
# Expected output: 0.4.2
```

---

## Usage

### Start Dashboard

```bash
ocam
# or
opencode-account-manager
```

### CLI Commands

```bash
# List accounts
ocam list

# Export accounts
ocam export -o backup.json

# Import accounts
ocam import backup.json

# Import from Antigravity Manager folder
ocam import-am

# Help
ocam --help
```

---

## Keyboard Shortcuts

### Main Dashboard

| Key | Action |
|-----|--------|
| `Tab` | Switch section (Providers → Accounts → MCP) |
| `R` | Refresh data |
| `E` | Export accounts |
| `I` | Import accounts |
| `A` | Import from Antigravity Manager |
| `S` | Enter Select Mode |
| `Q` | Quit |

### Select Mode (Accounts)

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate |
| `Space` | Toggle selection |
| `A` | Select all |
| `N` | Deselect all |
| `E` | Enable selected |
| `D` | Disable selected |
| `X` | Export selected |
| `DEL` | Delete selected |
| `Esc` | Exit Select Mode |

---

## Supported Import Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Encrypted | `.ocam` | AES-256-GCM encrypted, password required |
| Portable | `.json` | OpenCode Account Manager plain export |
| AM Export | `.json` | Antigravity Manager app export `[{email, refresh_token}]` |
| Plugin Native | `.json` | `antigravity-accounts.json` format |

---

## Configuration Paths

| File | Windows | Linux/Mac |
|------|---------|-----------|
| OpenCode config | `~/.config/opencode/opencode.json` | `~/.config/opencode/opencode.json` |
| Plugin accounts | `%APPDATA%/opencode/antigravity-accounts.json` | `~/.config/opencode/antigravity-accounts.json` |
| OCAM preferences | `%APPDATA%/opencode/ocam-config.json` | `~/.config/opencode/ocam-config.json` |

> **Note**: `~` on Windows resolves to your user home directory (e.g., `C:\Users\YourName`)

---

## Requirements

- **Node.js**: >= 16.x
- **OpenCode**: With Antigravity Auth plugin installed
- **Terminal**: Unicode and 256 colors support (Windows Terminal, iTerm2, etc.)

---

## Troubleshooting

### "command not found: ocam"

```bash
npm install -g opencode-account-manager
```

### "Plugin accounts file not found"

Login at least one account first:

```bash
opencode auth login
```

### "Cannot find module"

Reinstall the package:

```bash
npm uninstall -g opencode-account-manager
npm install -g opencode-account-manager
```

---

## Documentation

- [ROADMAP.md](./docs/ROADMAP.md) - Version history and plans
- [BLUEPRINT.md](./docs/BLUEPRINT.md) - Technical architecture

---

## Contributing

1. Fork the repo
2. Create branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Credits

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - The plugin this tool manages
- [OpenCode](https://opencode.ai) - The AI coding assistant

