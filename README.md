# OpenCode Account Manager (OCAM)

TUI Dashboard để quản lý tất cả providers, MCP servers, và plugin accounts của [OpenCode](https://opencode.ai).

## Tính năng

### Dashboard
- **Providers**: Xem tất cả AI providers (Google, Ollama, Claudible, Antigravity Manager) với số models
- **MCP Servers**: Xem trạng thái enabled/disabled của các MCP servers
- **Plugin Accounts**: Quản lý accounts của Antigravity Auth plugin
  - Xem rate limit status theo từng model (claude, gemini)
  - Enable/Disable accounts
  - Xóa accounts

### Export/Import (v0.4.0)
- **Encrypted Export (.ocam)**: Mã hóa AES-256-GCM với password
- **Plain JSON Export**: Format không mã hóa (backward compatible)
- **File Browser**: Chọn nhanh Desktop/Documents, duyệt folder, paste path
- **Import Preview**: Xem accounts nào đã tồn tại trước khi import
- **Overwrite Mode**: Accounts trùng sẽ được cập nhật khi import

---

## Cài đặt

### Cách 1: Clone từ GitHub (Recommended)

```bash
# Clone repo
git clone https://github.com/d-init-d/opencode-account-manager.git
cd opencode-account-manager

# Cài dependencies
npm install

# Build TypeScript
npm run build

# (Optional) Link để dùng command `ocam` ở mọi nơi
npm link
```

### Cách 2: Cài trực tiếp từ GitHub

```bash
npm install -g github:d-init-d/opencode-account-manager
```

### Kiểm tra cài đặt

```bash
# Nếu đã npm link hoặc cài global
ocam --version

# Hoặc chạy trực tiếp
node dist/cli.js --version
```

---

## Sử dụng

### Mở Dashboard (TUI)

```bash
# Cách 1: Command ngắn (nếu đã npm link)
ocam

# Cách 2: Command đầy đủ
opencode-account-manager

# Cách 3: Từ thư mục project
npm run dashboard

# Cách 4: Chạy trực tiếp
node dist/cli.js dashboard
```

### CLI Commands

```bash
# Xem danh sách accounts
ocam list

# Export accounts ra file JSON
ocam export -o backup.json

# Import accounts từ file
ocam import backup.json

# Import từ Antigravity Manager folder
ocam import-am

# Xem help
ocam --help
```

---

## Phím tắt trong Dashboard

### Main Dashboard

| Phím | Chức năng |
|------|-----------|
| `Tab` | Chuyển section (Providers → Accounts → MCP) |
| `R` | Refresh dữ liệu |
| `E` | Export accounts (mở menu chọn format) |
| `I` | Import accounts (mở file browser) |
| `A` | Import từ Antigravity Manager folder |
| `S` | Bật Select Mode (trong section Accounts) |
| `Q` | Thoát |

### Select Mode (trong Accounts)

| Phím | Chức năng |
|------|-----------|
| `↑/↓` | Di chuyển lên/xuống |
| `Space` | Chọn/bỏ chọn account |
| `A` | Chọn tất cả |
| `N` | Bỏ chọn tất cả |
| `E` | Enable các accounts đã chọn |
| `D` | Disable các accounts đã chọn |
| `X` | Export các accounts đã chọn |
| `DEL` | Xóa các accounts đã chọn |
| `S` / `Esc` | Thoát Select Mode |

### Export Flow

1. Bấm `E` để export
2. Chọn format: `[1] Encrypted (.ocam)` hoặc `[2] Plain JSON`
3. Chọn folder lưu file
4. Nhập password (chỉ với encrypted)
5. Done!

### Import Flow

1. Bấm `I` để import
2. Duyệt và chọn file `.ocam` hoặc `.json`
3. Nhập password (chỉ với file encrypted)
4. Xem preview các accounts
5. Bấm `Enter` để confirm import

---

## File Formats

### Encrypted (.ocam)
- Mã hóa AES-256-GCM với scrypt key derivation
- Cần password để mở
- Khuyến nghị dùng khi backup hoặc share

### Plain JSON (.json)
- Human-readable, không mã hóa
- Chứa refresh tokens dạng clear text
- Chỉ nên dùng cho local backup

---

## Các file cấu hình

| File | Vị trí | Mô tả |
|------|--------|-------|
| `opencode.json` | `~/.config/opencode/` | Config chính của OpenCode (providers, MCP) |
| `antigravity-accounts.json` | `%APPDATA%/opencode/` | Accounts của plugin (Windows) |
| `antigravity-accounts.json` | `~/.config/opencode/` | Accounts của plugin (Linux/Mac) |
| `ocam-config.json` | `%APPDATA%/opencode/` | Preferences của app (recent folders) |

---

## Yêu cầu hệ thống

- **Node.js**: >= 16.x
- **OpenCode**: Cần cài sẵn OpenCode với Antigravity Auth plugin
- **Terminal**: Hỗ trợ Unicode và 256 colors (Windows Terminal, iTerm2, etc.)

---

## Screenshots

```
* OpenCode Account Manager - Dashboard
────────────────────────────────────────────────────────────────
Providers  Models  MCP On  MCP Off  Accounts  Available  Limited
    4        29       6        0        5          3         2

Sections: [1] Providers  [2] Accounts  [3] MCP  (Tab to switch)

╭─ PROVIDERS ──────────────────────────────────────────────────╮
│ PROVIDER            MODELS  TYPE      BASE URL              │
│ Google              7       builtin   -                     │
│ Ollama              5       custom    http://localhost:11434│
│ Claudible           3       custom    https://claudible.io  │
│ Antigravity Manager 14      custom    http://localhost:8045 │
╰──────────────────────────────────────────────────────────────╯

╭─ PLUGIN ACCOUNTS (opencode-antigravity-auth) ────────────────╮
│ EMAIL                         STATUS     RATE LIMIT          │
│ user1@gmail.com               enabled    claude: 2.1h        │
│ user2@gmail.com               enabled    OK                  │
│ user3@gmail.com               disabled   -                   │
╰──────────────────────────────────────────────────────────────╯

╭─ MCP SERVERS ────────────────────────────────────────────────╮
│ SERVER              STATUS     ENV   COMMAND                 │
│ playwright          enabled    0     npx @playwright/mcp     │
│ firecrawl           enabled    1     npx firecrawl-mcp       │
│ github              enabled    1     npx @modelcontextprot...│
╰──────────────────────────────────────────────────────────────╯

┌──────────────────────────────────────────────────────────────┐
│ [R] Refresh  [E] Export  [I] Import  [A] AM Import  [S] Select Mode  [Q] Quit │
└──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Lỗi "command not found: ocam"

```bash
# Nếu chưa npm link, chạy:
cd /path/to/opencode-account-manager
npm link

# Hoặc chạy trực tiếp:
node /path/to/opencode-account-manager/dist/cli.js
```

### Lỗi "Cannot find module"

```bash
# Rebuild project
npm run build
```

### Lỗi "Plugin accounts file not found"

Cần đăng nhập ít nhất 1 account trong OpenCode trước:
```bash
opencode auth login
```

---

## Documentation

- [ROADMAP.md](./docs/ROADMAP.md) - Lịch sử phiên bản và kế hoạch
- [BLUEPRINT.md](./docs/BLUEPRINT.md) - Kiến trúc kỹ thuật

---

## Contributing

1. Fork repo
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: mô tả"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## License

MIT
