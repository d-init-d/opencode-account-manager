---
description: Sync accounts from Antigravity Manager to OpenCode plugin
---

Use the `sync-accounts` tool to sync accounts between Antigravity Manager and OpenCode plugin.

This will:
- Add missing accounts from AM to Plugin
- Sync enabled/disabled state
- Update tokens if newer in AM
- Preserve fingerprints and rate limit info
- Auto-set optimal strategy (sticky/hybrid/round-robin)
