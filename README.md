# Antigravity Account Sync for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sync accounts between **Antigravity Manager** (GUI tool) and **opencode-antigravity-auth** plugin automatically. Never manually copy accounts again!

## What You Get

- **Auto-sync on startup** - Plugin syncs accounts when OpenCode starts
- **Smart merge** - Only adds missing accounts, preserves existing fingerprints and rate limits
- **Enabled/disabled sync** - When you disable an account in AM, it gets disabled in OpenCode too
- **Strategy auto-config** - Automatically sets optimal rotation strategy based on account count
- **Backup protection** - Creates backups before any write operation
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

Use these tools when you need to sync manually:

| Tool | Description |
|------|-------------|
| `sync-accounts` | Perform full sync between AM and Plugin |
| `sync-status` | Show comparison without making changes |

**Example output from `sync-accounts`:**
```
=== Antigravity Account Sync Complete ===

Accounts: 10 -> 15
Strategy: round-robin

Added (5):
  + user1@gmail.com
  + user2@gmail.com

Disabled (1):
  x broken.account@gmail.com

Re-enabled (1):
  o fixed.account@gmail.com
```

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
+---------------------------------------------------------------+
|                        SYNC FLOW                               |
+---------------------------------------------------------------+
|                                                                |
|   1. Load accounts from both sources                           |
|      - AM: ~/.antigravity_tools/accounts.json                  |
|      - Plugin: ~/.config/opencode/antigravity-accounts.json    |
|                                                                |
|   2. Merge by email                                            |
|      - Only in AM (enabled) -> Add to Plugin                   |
|      - Only in AM (disabled) -> Skip                           |
|      - Only in Plugin -> Keep (don't remove)                   |
|      - In both -> Sync enabled/disabled state                  |
|      - proxy_disabled in AM -> Skip/Remove from Plugin         |
|                                                                |
|   3. Calculate strategy                                        |
|      - 1 account -> sticky                                     |
|      - 2-3 accounts -> hybrid                                  |
|      - 4+ accounts -> round-robin + pid_offset                 |
|                                                                |
|   4. Backup & Write                                            |
|      - Backup to ~/.antigravity-sync-backups/                  |
|      - Write updated files                                     |
|                                                                |
+---------------------------------------------------------------+
```

### Enabled/Disabled Sync

When an account is disabled in AM (e.g., due to `invalid_grant`), the plugin will:

1. **Detect** the disabled state from AM
2. **Update** the `enabled: false` field in the plugin accounts
3. **Report** it as "Disabled" in sync output

When you re-enable the account in AM (e.g., by re-authenticating), the plugin will:

1. **Detect** the enabled state
2. **Update** `enabled: true` in the plugin
3. **Report** it as "Re-enabled" in sync output

### File Locations

| File | Path (All Platforms) |
|------|---------------------|
| AM Accounts Index | `~/.antigravity_tools/accounts.json` |
| AM Account Details | `~/.antigravity_tools/accounts/{uuid}.json` |
| Plugin Accounts | `~/.config/opencode/antigravity-accounts.json` |
| Plugin Settings | `~/.config/opencode/antigravity.json` |
| Sync Plugin | `~/.config/opencode/plugins/antigravity-sync.ts` |
| Backups | `~/.antigravity-sync-backups/` |

> **Note**: On Windows, `~` = `C:\Users\YourName`. The plugin uses `~/.config/opencode/` on **all platforms** (not `%APPDATA%`).

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

**Disabled accounts not syncing**
- The plugin syncs the enabled/disabled state on each sync
- Run `sync-accounts` to force a sync

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
