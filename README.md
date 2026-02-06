# OpenCode Account Manager (OCAM)

<div align="center">
  <h3>TUI Dashboard for OpenCode Account Management</h3>
  <p>Manage providers, MCP servers, and plugin accounts in one place.</p>
  
  <p>
    <a href="https://www.npmjs.com/package/opencode-account-manager">
      <img src="https://img.shields.io/npm/v/opencode-account-manager.svg" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/opencode-account-manager">
      <img src="https://img.shields.io/npm/dw/opencode-account-manager.svg" alt="npm downloads">
    </a>
    <a href="https://github.com/d-init-d/opencode-account-manager/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
    </a>
  </p>

  <p>
    <strong>English</strong> | 
    <a href="./README_VI.md">Tiếng Việt</a>
  </p>
</div>

---

## Features

- **Providers View**: See all AI providers (Google, Ollama, Anthropic, etc.) with model counts
- **MCP Servers**: View enabled/disabled status of MCP servers
- **Plugin Accounts**: Manage Google accounts connected to OpenCode
  - Rate limit status per model (claude, gemini)
  - Enable/Disable/Delete accounts
- **Account Health Check**: Validate refresh tokens and flag verification required
- **Encrypted Export**: AES-256-GCM encryption with password protection
- **Multi-format Import**: Support for encrypted `.ocam`, plain JSON, and Antigravity Manager exports

---

## Installation

### Option A: Let an LLM do it

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install opencode-account-manager globally via npm, then run "ocam" to verify installation.
Repository: https://github.com/d-init-d/opencode-account-manager
```

### Option B: Install from npm

```bash
npm install -g opencode-account-manager
```

### Option C: Install from GitHub

```bash
npm install -g github:d-init-d/opencode-account-manager
```

### Verify installation

```bash
ocam --version
```

---

## For LLM Agents

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

# Export accounts (encrypted by default)
ocam export -o backup.ocam
# Or with env variable (non-interactive)
OCAM_EXPORT_PASSWORD="your-password" ocam export -o backup.ocam

# Export as plain JSON (requires acknowledgment)
ocam export -o backup.json --plain --i-understand

# Import accounts
ocam import backup.ocam

# Import from Antigravity Manager folder
ocam import-am

# Health check
ocam check

# Health check (specific emails)
ocam check --emails user1@example.com,user2@example.com

# Health check (bypass cache)
ocam check --force

# Help
ocam --help
```

> **Security Notes**:
> - CLI export defaults to encrypted format (AES-256-GCM)
> - Password can be set via `OCAM_EXPORT_PASSWORD` env var or interactive prompt
> - `--password` flag has been removed for security (avoid exposing passwords in shell history)
> - Plain export requires both `--plain` and `--i-understand` flags

**Health Check OAuth Config**
Set OAuth client credentials via environment variables:

```
OCAM_OAUTH_CLIENT_ID=...
OCAM_OAUTH_CLIENT_SECRET=...
OCAM_OAUTH_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token
```

**Security Configuration**
- **OAuth Endpoint Allowlist**: Only `https://oauth2.googleapis.com/token` is allowed by default
- **Custom Endpoints**: Set `OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT=true` to use non-standard endpoints
- **clientSecret Storage**: OCAM warns if `clientSecret` is stored in config file (use env var instead)

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
| Portable | `.json` | OpenCode Account Manager plain export (⚠️ shows security warning) |
| AM Export | `.json` | Antigravity Manager app export `[{email, refresh_token}]` |
| Plugin Native | `.json` | `antigravity-accounts.json` format |

> **Security Warning**: Plaintext exports (`.json`) will display a warning about credential visibility. Encrypted exports (`.ocam`) are recommended for production use.

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
- **OpenCode**: Installed and configured
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

### Config Parse Warnings

OCAM now warns when config files fail to parse:

```
Warning: Failed to parse opencode.json - Unexpected token ...
Warning: Failed to parse ocam-config.json - ...
```

These warnings appear on CLI startup and help identify configuration issues.

### Security Warnings

**clientSecret in Config File**
```
Warning: OAuth clientSecret should not be stored in ocam-config.json.
Please use OCAM_OAUTH_CLIENT_SECRET environment variable instead.
```

**Custom OAuth Endpoint Not Allowed**
```
Warning: Custom OAuth token endpoint "..." is not in the allowlist.
Set OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT=true to allow custom endpoints.
```

**Plain Text Export Warning**
```
⚠️  WARNING: Exporting in PLAIN TEXT format.
    Your account credentials will be visible in the output file.
    This is insecure and should only be used for testing/development.
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

- [OpenCode](https://opencode.ai) - The AI coding assistant this tool is built for
- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Optional plugin for Google OAuth authentication
