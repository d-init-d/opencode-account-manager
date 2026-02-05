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

### v0.4.2 - Antigravity Manager Export Support (Current)
- [x] **AM Export Import** - Support `[{email, refresh_token}]` format
- [x] **Auto-detect Format** - Recognize encrypted, portable, AM export formats
- [x] **Format Preview** - Show detected format in import preview
- [x] **Professional README** - Updated documentation with LLM installation guide

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

### v0.7.0 - Account Health
- [ ] Check if refresh tokens are still valid
- [ ] Auto-refresh expired tokens
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

## Contributing

See [BLUEPRINT.md](./BLUEPRINT.md) for technical architecture and implementation details.
