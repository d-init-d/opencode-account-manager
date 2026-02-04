# Antigravity Account Sync for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sync accounts between **Antigravity Manager** (GUI tool) and **opencode-antigravity-auth** plugin automatically. Never manually copy accounts again!

## What You Get

- **Auto-sync on startup** - Plugin syncs accounts when OpenCode starts
- **Smart merge** - Only adds missing accounts, preserves existing fingerprints and rate limits
- **Strategy auto-config** - Automatically sets optimal rotation strategy based on account count
- **Backup protection** - Creates backups before any write operation
- **Enabled/disabled sync** - Respects disabled state from AM (invalid_grant, etc.)
- **Slash commands** - `/sync-accounts` and `/sync-status` for quick access
- **Two sync tools** - `sync-accounts` for manual sync, `sync-status` for comparison

---

## Prerequisites

Before installing this plugin, you need:

1. **Antigravity Manager** installed at `~/.antigravity_tools/`
   - Download from: [Antigravity Manager releases](https://github.com/anomalyco/antigravity-manager/releases)
   
2. **opencode-antigravity-auth** plugin already configured
   - Follow: [opencode-antigravity-auth README](https://github.com/NoeFabris/opencode-antigravity-auth)

---

## Installation

<details open>
<summary><b>For Humans</b></summary>

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install the antigravity-sync plugin for OpenCode by copying the plugin file from https://github.com/d-init-d/opencode-account-sync to ~/.config/opencode/plugins/antigravity-sync.ts
```

**Option B: Manual setup**

1. **Download the plugin file:**

   ```bash
   # Windows (PowerShell)
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/d-init-d/opencode-account-sync/main/antigravity-sync.ts" -OutFile "$HOME\.config\opencode\plugins\antigravity-sync.ts"
   
   # macOS/Linux
   curl -o ~/.config/opencode/plugins/antigravity-sync.ts https://raw.githubusercontent.com/d-init-d/opencode-account-sync/main/antigravity-sync.ts
   ```

2. **Restart OpenCode** - the plugin will auto-sync on startup

3. **Verify it works:**
   - Look for `[antigravity-sync] Sync complete` in startup logs
   - Or use the `sync-status` tool to check

</details>

<details>
<summary><b>For LLM Agents</b></summary>

### Step-by-Step Instructions

1. Create the plugins directory if it doesn't exist:
   ```
   ~/.config/opencode/plugins/
   ```
   
   > **Note**: On Windows, `~` resolves to your user home directory (e.g., `C:\Users\YourName`).

2. Download or copy the plugin file `antigravity-sync.ts` to:
   ```
   ~/.config/opencode/plugins/antigravity-sync.ts
   ```

3. The plugin source is at:
   ```
   https://raw.githubusercontent.com/d-init-d/opencode-account-sync/main/antigravity-sync.ts
   ```

4. Restart OpenCode for the plugin to load

5. (Optional) Install slash commands for quick access:
   ```
   ~/.config/opencode/commands/sync-accounts.md
   ~/.config/opencode/commands/sync-status.md
   ```
   
   Download from:
   ```
   https://raw.githubusercontent.com/d-init-d/opencode-account-sync/main/commands/sync-accounts.md
   https://raw.githubusercontent.com/d-init-d/opencode-account-sync/main/commands/sync-status.md
   ```

### Verification

After restart, you should see in logs:
```
[antigravity-sync] Starting auto-sync...
[antigravity-sync] Sync complete. X added, Y updated. Total: Z accounts.
```

</details>

---

## Usage

### Automatic Sync

The plugin **automatically syncs** when OpenCode starts. No action needed!

### Manual Sync

**Option 1: Slash Commands (Recommended)**

Type in OpenCode:
- `/sync-accounts` - Perform full sync
- `/sync-status` - Show comparison without changes

**Option 2: Natural Language**

Just ask the AI:
- "sync my accounts"
- "show sync status"

| Tool | Description |
|------|-------------|
| `sync-accounts` | Perform full sync between AM and Plugin |
| `sync-status` | Show comparison without making changes |

**Example output from `sync-status`:**
```
=== Antigravity Sync Status ===

AM accounts (enabled): 10
Plugin accounts: 5
Strategy: round-robin
PID offset: enabled

Missing in Plugin (5):
  - open.code.one@gmail.com
  - nmd050906@gmail.com
  - d.init.d.dev@gmail.com
  - dtechleihas@gmail.com
  - d.init.d.code@gmail.com

Run sync-accounts to sync.
```

---

## How It Works

### Sync Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYNC FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. Load accounts from both sources                             │
│      - AM: ~/.antigravity_tools/accounts.json                    │
│      - Plugin: ~/.config/opencode/antigravity-accounts.json      │
│                                                                  │
│   2. Merge by email                                              │
│      - Only in AM → Add to Plugin (with new fingerprint)         │
│      - Only in Plugin → Keep (don't remove)                      │
│      - In both → Keep Plugin version (preserve fingerprint)      │
│      - proxy_disabled in AM → Skip/Remove from Plugin            │
│      - disabled in AM → Sync disabled state to Plugin            │
│                                                                  │
│   3. Calculate strategy                                          │
│      - 1 account → sticky                                        │
│      - 2-3 accounts → hybrid                                     │
│      - 4+ accounts → round-robin + pid_offset                    │
│                                                                  │
│   4. Backup & Write                                              │
│      - Backup to ~/.antigravity-sync-backups/                    │
│      - Write updated files                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Locations

| File | Windows Path | macOS/Linux Path |
|------|--------------|------------------|
| AM Accounts Index | `~\.antigravity_tools\accounts.json` | `~/.antigravity_tools/accounts.json` |
| AM Account Details | `~\.antigravity_tools\accounts\{uuid}.json` | `~/.antigravity_tools/accounts/{uuid}.json` |
| Plugin Accounts | `~\.config\opencode\antigravity-accounts.json` | `~/.config/opencode/antigravity-accounts.json` |
| Plugin Settings | `~\.config\opencode\antigravity.json` | `~/.config/opencode/antigravity.json` |
| Sync Plugin | `~\.config\opencode\plugins\antigravity-sync.ts` | `~/.config/opencode/plugins/antigravity-sync.ts` |
| Slash Commands | `~\.config\opencode\commands\*.md` | `~/.config/opencode/commands/*.md` |
| Backups | `~\.antigravity-sync-backups\` | `~/.antigravity-sync-backups/` |

---

## Strategy Auto-Configuration

The plugin automatically sets the optimal account rotation strategy:

| Account Count | Strategy | PID Offset |
|---------------|----------|------------|
| 1 | `sticky` | disabled |
| 2-3 | `hybrid` | disabled |
| 4+ | `round-robin` | enabled |

This prevents rate limiting issues and maximizes quota usage.

---

## Troubleshooting

### Plugin Not Loading

1. Check file location:
   ```powershell
   # Windows
   Test-Path "$HOME\.config\opencode\plugins\antigravity-sync.ts"
   ```

2. Check OpenCode logs for errors

3. Ensure file has correct TypeScript syntax

### Sync Errors

**"Cannot read AM accounts index"**
- Antigravity Manager not installed or accounts.json doesn't exist
- Install AM and add at least one account

**Accounts not syncing**
- Check if account is `proxy_disabled` in AM
- Check if account is `disabled` (invalid_grant) in AM

### Rollback

If sync causes issues, restore from backup:

```powershell
# Windows - list backups
dir $HOME\.antigravity-sync-backups\

# Restore latest backup
copy "$HOME\.antigravity-sync-backups\antigravity-accounts.json.{timestamp}.bak" "$HOME\.config\opencode\antigravity-accounts.json"
```

### Disable Plugin

Rename to disable without deleting:

```powershell
# Windows
Rename-Item "$HOME\.config\opencode\plugins\antigravity-sync.ts" "antigravity-sync.ts.disabled"
```

---

## Configuration

No configuration needed! The plugin works out of the box.

However, if you want to customize strategy settings, edit `antigravity.json`:

```json
{
  "account_selection_strategy": "round-robin",
  "pid_offset_enabled": true
}
```

---

## Compatibility

| Component | Version |
|-----------|---------|
| OpenCode | 0.3.x+ |
| opencode-antigravity-auth | 1.3.x+ |
| Antigravity Manager | 2.x+ |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Credits

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) by [@NoeFabris](https://github.com/NoeFabris)
- [Antigravity Manager](https://github.com/anomalyco/antigravity-manager)

---

## Contributing

Issues and PRs welcome! Please check existing issues before creating new ones.
