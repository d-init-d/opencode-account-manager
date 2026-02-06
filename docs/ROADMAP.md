# OpenCode Account Manager - Roadmap

## Version History

### v0.1.0 - Initial Release
- [x] Basic TUI dashboard
- [x] View accounts from antigravity-auth plugin
- [x] Show rate limit status per account
- [x] Import from Antigravity Manager folder

### v0.2.0 - Account Management
- [x] Select mode with keyboard navigation
- [x] Enable/Disable selected accounts
- [x] Delete selected accounts
- [x] Export selected accounts to JSON
- [x] Per-model rate limit display (claude, gemini, etc.)

### v0.3.0 - OpenCode Dashboard
- [x] Rename to opencode-account-manager
- [x] Read opencode.json config
- [x] Display all AI providers with model counts
- [x] Display MCP servers with enabled/disabled status
- [x] Tab navigation between sections (Providers, Accounts, MCP)
- [x] Collapsible sections

### v0.4.0 - Encrypted Export/Import
- [x] **Encrypted Export** - AES-256-GCM with password protection
- [x] **Plain JSON Export** - Keep original format as option
- [x] **File Browser UI** - Browse folders, quick locations, paste path
- [x] **Import from File** - Select .ocam or .json files
- [x] **Password Input** - Masked input with confirmation
- [x] **Remember Preferences** - Last export/import folder saved
- [x] **Overwrite Mode** - Replace existing accounts on import

### v0.4.1 - npm Publish
- [x] Published to npm registry
- [x] Global install via `npm install -g opencode-account-manager`
- [x] Commands: `ocam`, `opencode-account-manager`

### v0.4.2 - Antigravity Manager Export Support
- [x] **AM Export Import** - Support `[{email, refresh_token}]` format
- [x] **Auto-detect Format** - Recognize encrypted, portable, AM export formats
- [x] **Format Preview** - Show detected format in import preview
- [x] **Professional README** - Updated documentation with LLM installation guide

### v0.4.3 - Keyboard Navigation Fix
- [x] **Number Keys** - Press 1/2/3 to switch sections (Providers/Accounts/MCP)
- [x] **Tab Navigation** - Fixed Tab key to cycle through sections
- [x] **UI Indicator** - Show `[1] Providers [2] Accounts [3] MCP` in header

### v0.4.4 - Arrow Key Navigation
- [x] **←→ Arrow Keys** - Switch between sections (Providers ↔ Accounts ↔ MCP)
- [x] **↑↓ Arrow Keys** - Navigate account list, auto-enters select mode
- [x] **Space Key** - Toggle selection in select mode
- [x] **Updated Help Text** - Show arrow key hints in UI

### v0.5.0 - OpenCode-style UX
- [x] **Action Palette** - Press P to open command palette (like OpenCode Ctrl+P)
- [x] **Unified Navigation** - ↑↓ to navigate everything, Enter to expand/select
- [x] **Simplified Controls** - No more complex keyboard shortcuts to remember
- [x] **Inline Selection** - Space to toggle, selection count shown in help bar
- [x] **Removed MenuBar** - Clean minimal interface

### v0.5.1 - Dashboard Tab
- [x] **Two Tabs** - Dashboard (rate limits) + Settings (providers, accounts, MCP)
- [x] **Tab Switching** - Press Tab to switch between Dashboard and Settings
- [x] **Rate Limit View** - Like Antigravity Manager, shows accounts with model limits
- [x] **Progress Bars** - Visual indicator of rate limit status per model
- [x] **Time Remaining** - Shows hours/minutes until limit resets

### v0.5.2 - Loading Indicator
- [x] **Loading State** - Shows progress during refresh
- [x] **Step Messages** - "Loading OpenCode config...", "Loading accounts...", "Done!"
- [x] **R Key Shortcut** - Added R to help bar for quick refresh

### v0.6.5 - Security & CLI Improvements (Current)
- [x] **Encrypted Export Default** - CLI export now defaults to encrypted format
- [x] **Password Prompt** - Interactive password prompt or use `OCAM_EXPORT_PASSWORD` env var
- [x] **Removed --password Flag** - No longer accepts `--password` on command line (security)
- [x] **Plain Export Acknowledgment** - Plain export requires both `--plain` and `--i-understand` flags
- [x] **Plaintext Warning** - Security warning shown when exporting without encryption
- [x] **Config Parse Warnings** - CLI warns when opencode.json or ocam-config.json fails to parse
- [x] **ExportedFrom Field** - Portable export now includes `exportedFrom: "opencode-account-manager"`
- [x] **OAuth Endpoint Allowlist** - Only allows `https://oauth2.googleapis.com/token` by default
- [x] **Custom Endpoint Override** - Set `OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT=true` to allow custom endpoints
- [x] **clientSecret Warning** - Warns when clientSecret is stored in config file (should use env var)

### v0.6.4 - Account Health Check
- [x] **Health Check Cache** - TTL + cooldown stored in ocam-config.json
- [x] **OAuth Validation** - Refresh token check with status mapping
- [x] **Log Hints** - Parse antigravity-logs for verification errors
- [x] **Dashboard Badges** - Health indicator + summary counts
- [x] **CLI Command** - `ocam check` with progress and warnings

**Controls:**
| Key | Action |
|-----|--------|
| Tab | Switch between Dashboard and Settings |
| ↑↓ | Navigate accounts/sections |
| Space | Toggle account selection |
| R | Refresh with progress indicator |
| H | Check account health |
| P | Open Action Palette |
| Q | Quit |

---

## Test & CI Status

### Test Coverage
- [x] **Unit Tests** - Crypto, account merging, format detection
- [x] **Import Tests** - Encrypted, plain, AM export formats
- [x] **Health Check Tests** - OAuth validation, cache logic
- [x] **Config Tests** - Parse warnings, error handling

### CI/CD
- [x] **Build Verification** - TypeScript compilation
- [x] **Test Execution** - Automated test suite
- [x] **Lint Checks** - Code style validation

---

## Future Ideas (Backlog)

### v0.5.0 - Enhanced Security
- [ ] Password strength indicator
- [ ] Auto-lock after inactivity
- [ ] Encrypted storage for config

### v0.6.0 - Cloud Sync
- [ ] Sync accounts to cloud storage (Google Drive, Dropbox)
- [ ] Multi-device sync
- [ ] Conflict resolution

### v0.7.0 - Account Health (Follow-ups)
- [ ] Auto-refresh expired tokens
- [ ] Background health monitoring
- [ ] Health check on startup

### v0.8.0 - MCP Management
- [ ] Enable/Disable MCP servers from TUI
- [ ] Add new MCP servers
- [ ] View MCP server logs

### v0.9.0 - Provider Management
- [ ] Add/Edit custom providers
- [ ] Test provider connection
- [ ] Model usage statistics

### v1.0.0 - Stable Release
- [x] npm publish
- [ ] Full documentation
- [ ] Windows/Mac/Linux installers
- [ ] Integration tests

---

## Manual Test Checklist (Health Check)

- [ ] **Happy path**: OAuth config set, refresh token valid → status `ok`
- [ ] **Invalid grant**: revoked/expired token → status `revoked` (or `password_changed` if error_description matches)
- [ ] **Verification required**: trigger `verification_required` mapping via `invalid_grant` with verify/challenge text
- [ ] **Network error**: disconnect network → status `network_error`
- [ ] **Missing OAuth config**: no client_id/client_secret → status `not_configured`

---

## Contributing

See [BLUEPRINT.md](./BLUEPRINT.md) for technical architecture and implementation details.
