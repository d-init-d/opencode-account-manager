# Antigravity Sync

Terminal (TUI) dashboard and CLI for managing OpenCode Antigravity Auth accounts. Import and export account lists without re-login overhead.

## Install

```bash
npm install
npm run build
```

## Run TUI

```bash
node dist/cli.js dashboard
```

Optional custom plugin file:

```bash
node dist/cli.js dashboard --plugin-path "C:\\path\\to\\antigravity-accounts.json"
```

## TUI Controls

- `R` Refresh data
- `E` Export to `antigravity-export-<timestamp>.json`
- `I` Import hint (use CLI)
- `A` Import from AM hint (use CLI)
- `Q` Quit

## CLI Commands

```bash
node dist/cli.js list
node dist/cli.js export --out ./backup.json
node dist/cli.js import --file ./backup.json --mode merge
node dist/cli.js import --file ./backup.json --mode replace
node dist/cli.js am:inspect --db "C:\\path\\to\\accounts.db"
node dist/cli.js am:import --db "C:\\path\\to\\accounts.db" --mode merge
```

## Default Paths (Windows)

- Plugin accounts: `%APPDATA%\\opencode\\antigravity-accounts.json`
- Antigravity Manager DB: `%APPDATA%\\antigravity-manager\\accounts.db`

## Import Formats

- Portable export from this tool
- Plugin accounts file (raw `antigravity-accounts.json`)

## Notes

- AM import is read-only for `accounts.db`.
- Export files include refresh tokens. Treat them as sensitive.
- If the plugin file does not exist, login at least one account or pass `--plugin-path`.
