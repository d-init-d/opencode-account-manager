# Antigravity Account Manager

OpenCode plugin for managing Antigravity Auth accounts directly from chat.

## Features

- **account-list** - List all accounts with rate limit status
- **account-status** - View summary statistics (available/limited/disabled)
- **account-export** - Export accounts to JSON backup file
- **account-import** - Import accounts from JSON file (merge or replace)

## Installation

### Option 1: Copy plugin file

Copy the plugin to your OpenCode plugins folder:

```powershell
# Windows
Copy-Item "plugin\antigravity-sync.ts" "$env:USERPROFILE\.config\opencode\plugins\"

# macOS/Linux
cp plugin/antigravity-sync.ts ~/.config/opencode/plugins/
```

### Option 2: Clone and link

```bash
git clone https://github.com/d-init-d/opencode-account-sync.git
cd opencode-account-sync
```

Then copy or symlink `plugin/antigravity-sync.ts` to `~/.config/opencode/plugins/`

## Usage

After installing, restart OpenCode and use natural language:

```
"show my accounts"        → calls account-list
"account status"          → calls account-status  
"export my accounts"      → calls account-export
"import from backup.json" → calls account-import
```

Or ask the AI to call the tools directly.

## Tool Details

### account-list

Lists all accounts showing:
- Email address
- Status: `[  OK  ]` or `[LIMITED]`
- Rate limit reset times per model (if limited)
- `[DISABLED]` flag if account is disabled

Example output:
```
=== Account List ===

[  OK  ] user1@gmail.com
[LIMITED] user2@gmail.com
          └─ claude: 2.5h
[  OK  ] user3@gmail.com [DISABLED]

Summary: 1 available, 1 rate-limited, 3 total
```

### account-status

Shows summary statistics:
```
=== Account Status ===

Total accounts: 10
  Available:    7
  Rate-limited: 2
  Disabled:     1

Strategy: round-robin
PID offset: enabled
```

### account-export

Exports all accounts to a portable JSON file.

Arguments:
- `filePath` (optional): Output path. Defaults to `~/antigravity-accounts-export.json`

### account-import

Imports accounts from a JSON file.

Arguments:
- `filePath` (required): Path to JSON file
- `mode` (optional): `merge` (default) or `replace`
  - **merge**: Add new accounts, update existing ones, keep accounts not in import
  - **replace**: Replace all accounts with imported ones

## File Locations

| File | Path |
|------|------|
| Plugin accounts | `~/.config/opencode/antigravity-accounts.json` |
| Plugin settings | `~/.config/opencode/antigravity.json` |
| Backups | `~/.antigravity-sync-backups/` |

Note: The plugin uses `~/.config/opencode/` on ALL platforms (including Windows).

## Security Notes

- Export files contain refresh tokens - treat as sensitive
- Backups are created automatically before import (max 5 kept)
- Never commit export files to version control

## License

MIT
