# Antigravity Sync Plugin - New Roadmap

## Vision
**Antigravity Sync** sẽ trở thành **TUI Dashboard trong terminal** cho plugin `opencode-antigravity-auth`, cung cấp giao diện quản lý accounts tương tự Antigravity Manager app.

---

## Core Features

### 1. Dashboard UI (Priority: HIGH)
- [ ] Giao diện TUI (Ink) trong terminal
- [ ] Hiển thị danh sách accounts với thông tin:
  - Email
  - Project ID
  - Rate limit status (available/limited)
  - Time until reset
  - Last used timestamp
- [ ] Color-coded status indicators (green/yellow/red)
- [ ] Real-time refresh

### 2. Import/Export Accounts (Priority: HIGH)
- [ ] **Export** accounts từ plugin ra file JSON
  - Bảo toàn fingerprints
  - Bảo toàn rate limit times
  - Encrypted option cho sensitive data
- [ ] **Import** accounts từ file JSON vào plugin
  - Merge mode (thêm mới, giữ existing)
  - Replace mode (thay thế toàn bộ)
  - Validation trước khi import

### 3. Antigravity Manager Compatibility (Priority: MEDIUM)
- [ ] Đọc file `accounts.db` từ AM (SQLite)
- [ ] Convert AM format → Plugin format
- [ ] Chỉ **đọc** từ AM, không ghi ngược lại
- [ ] UI hiển thị accounts từ AM để user chọn import

### 4. Account Management (Priority: MEDIUM)
- [ ] Enable/Disable individual accounts
- [ ] Delete accounts
- [ ] Regenerate fingerprint cho account
- [ ] View account details (fingerprint info, history)
- [ ] Manual rate limit reset (clear rateLimitResetTimes)

### 5. Strategy Configuration (Priority: LOW)
- [ ] Change rotation strategy (round-robin, random, least-used)
- [ ] Set PID offset on/off
- [ ] Configure rate limit behavior

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Antigravity Sync                       │
│                   (UI Dashboard)                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Dashboard  │    │   Import/   │    │    AM       │  │
│  │    View     │    │   Export    │    │  Reader     │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │  Plugin File    │                    │
│                   │    Manager      │                    │
│                   └────────┬────────┘                    │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  antigravity-accounts   │   │   AM accounts.db        │
│        .json            │   │     (read-only)         │
│  (Plugin accounts)      │   │                         │
└─────────────────────────┘   └─────────────────────────┘
```

---

## File Formats

### Plugin Account Format (antigravity-accounts.json)
```json
{
  "version": 3,
  "accounts": [
    {
      "email": "user@gmail.com",
      "refreshToken": "1//...",
      "projectId": "project-id",
      "managedProjectId": "project-id",
      "addedAt": 1770000000000,
      "lastUsed": 1770000000000,
      "rateLimitResetTimes": {
        "claude": 1770100000000
      },
      "fingerprint": {
        "deviceId": "uuid",
        "sessionToken": "hash",
        "userAgent": "antigravity/1.x.x platform/arch",
        "apiClient": "google-cloud-sdk ...",
        "clientMetadata": { ... },
        "quotaUser": "device-hash",
        "createdAt": 1770000000000
      }
    }
  ]
}
```

### Export Format (portable)
```json
{
  "version": 1,
  "exportedAt": 1770000000000,
  "exportedFrom": "antigravity-sync",
  "accounts": [ ... ]
}
```

---

## Milestones

### v0.1.0 - Foundation
- [ ] Setup project structure
- [ ] Basic CLI with account listing
- [ ] Read plugin accounts file

### v0.2.0 - Export/Import
- [ ] Export accounts to JSON file
- [ ] Import accounts from JSON file
- [ ] Merge/Replace modes

### v0.3.0 - AM Compatibility
- [ ] Read AM SQLite database
- [ ] Convert AM → Plugin format
- [ ] Import from AM feature

### v0.4.0 - TUI Dashboard
- [ ] Ink-based TUI
- [ ] Real-time account status

### v1.0.0 - Full Release
- [ ] Optional desktop app
- [ ] All account management features
- [ ] Strategy configuration
- [ ] Auto-update support

---

## Implementation Notes

### Why NOT sync with AM?
1. **Complexity**: Two-way sync giữa SQLite và JSON rất phức tạp
2. **Conflict resolution**: Khó xử lý khi cả 2 bên đều thay đổi
3. **Fingerprint preservation**: Mỗi platform có fingerprint riêng
4. **User control**: User muốn kiểm soát accounts nào dùng ở đâu

### Import Strategy
- Import = **copy** accounts từ source → plugin
- Fingerprints được **giữ nguyên** nếu có
- Nếu không có fingerprint → tạo mới
- Accounts đã tồn tại → skip hoặc update (user choice)

### AM File Location (Windows)
```
%APPDATA%\antigravity-manager\accounts.db
```

### Plugin File Location
```
%APPDATA%\opencode\antigravity-accounts.json
```
