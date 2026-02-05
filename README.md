# OpenCode Account Manager (OCAM)

[![npm version](https://img.shields.io/npm/v/opencode-account-manager.svg)](https://www.npmjs.com/package/opencode-account-manager)
[![npm downloads](https://img.shields.io/npm/dw/opencode-account-manager.svg)](https://www.npmjs.com/package/opencode-account-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/d-init-d/opencode-account-manager/blob/main/LICENSE)

TUI Dashboard to manage all providers, MCP servers, and plugin accounts for [OpenCode](https://opencode.ai).

**[🇻🇳 Tiếng Việt](#tiếng-việt)** | **[🇬🇧 English](#english)**

---

# English

## Features

- **Providers View**: See all AI providers (Google, Ollama, Anthropic, etc.) with model counts
- **MCP Servers**: View enabled/disabled status of MCP servers
- **Plugin Accounts**: Manage Google accounts connected to OpenCode
  - Rate limit status per model (claude, gemini)
  - Enable/Disable/Delete accounts
- **Encrypted Export**: AES-256-GCM encryption with password protection
- **Multi-format Import**: Support for encrypted `.ocam`, plain JSON, and Antigravity Manager exports

---

## Installation

**For Humans**

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install opencode-account-manager globally via npm, then run "ocam" to verify installation.
Repository: https://github.com/d-init-d/opencode-account-manager
```

**Option B: Install from npm**

```bash
npm install -g opencode-account-manager
```

**Option C: Install from GitHub**

```bash
npm install -g github:d-init-d/opencode-account-manager
```

**Verify installation:**

```bash
ocam --version
```

---

**For LLM Agents**

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

# Export accounts
ocam export -o backup.json

# Import accounts
ocam import backup.json

# Import from Antigravity Manager folder
ocam import-am

# Help
ocam --help
```

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
| Portable | `.json` | OpenCode Account Manager plain export |
| AM Export | `.json` | Antigravity Manager app export `[{email, refresh_token}]` |
| Plugin Native | `.json` | `antigravity-accounts.json` format |

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

---

---

# Tiếng Việt

## Tính năng

- **Xem Providers**: Hiển thị tất cả AI providers (Google, Ollama, Anthropic, etc.) với số lượng models
- **MCP Servers**: Xem trạng thái bật/tắt của các MCP servers
- **Quản lý Accounts**: Quản lý các tài khoản Google đang kết nối với OpenCode
  - Trạng thái rate limit theo từng model (claude, gemini)
  - Bật/Tắt/Xóa accounts
- **Export mã hóa**: Mã hóa AES-256-GCM với mật khẩu bảo vệ
- **Import đa định dạng**: Hỗ trợ file `.ocam` mã hóa, JSON thuần, và file export từ Antigravity Manager

---

## Cài đặt

**Dành cho người dùng**

**Cách A: Nhờ AI cài giúp**

Paste đoạn này vào bất kỳ AI agent nào (Claude Code, OpenCode, Cursor, etc.):

```
Cài đặt opencode-account-manager từ npm, sau đó chạy "ocam" để kiểm tra.
Repository: https://github.com/d-init-d/opencode-account-manager
```

**Cách B: Cài từ npm**

```bash
npm install -g opencode-account-manager
```

**Cách C: Cài từ GitHub**

```bash
npm install -g github:d-init-d/opencode-account-manager
```

**Kiểm tra cài đặt:**

```bash
ocam --version
```

---

**Dành cho AI Agents**

### Hướng dẫn từng bước

1. Chạy `npm install -g opencode-account-manager` để cài global
2. Chạy `ocam` để mở TUI dashboard
3. Dashboard sẽ tự động đọc config OpenCode tại `~/.config/opencode/opencode.json`

### Xác minh

```bash
ocam --version
# Kết quả mong đợi: 0.4.2
```

---

## Sử dụng

### Mở Dashboard

```bash
ocam
# hoặc
opencode-account-manager
```

### Các lệnh CLI

```bash
# Liệt kê accounts
ocam list

# Export accounts
ocam export -o backup.json

# Import accounts
ocam import backup.json

# Import từ thư mục Antigravity Manager
ocam import-am

# Trợ giúp
ocam --help
```

---

## Phím tắt

### Dashboard chính

| Phím | Chức năng |
|------|-----------|
| `Tab` | Chuyển section (Providers → Accounts → MCP) |
| `R` | Làm mới dữ liệu |
| `E` | Export accounts |
| `I` | Import accounts |
| `A` | Import từ Antigravity Manager |
| `S` | Vào chế độ chọn |
| `Q` | Thoát |

### Chế độ chọn (Accounts)

| Phím | Chức năng |
|------|-----------|
| `↑/↓` | Di chuyển |
| `Space` | Chọn/bỏ chọn |
| `A` | Chọn tất cả |
| `N` | Bỏ chọn tất cả |
| `E` | Bật các account đã chọn |
| `D` | Tắt các account đã chọn |
| `X` | Export các account đã chọn |
| `DEL` | Xóa các account đã chọn |
| `Esc` | Thoát chế độ chọn |

---

## Định dạng Import được hỗ trợ

| Định dạng | Đuôi file | Mô tả |
|-----------|-----------|-------|
| Mã hóa | `.ocam` | Mã hóa AES-256-GCM, cần mật khẩu |
| Portable | `.json` | Export thuần từ OpenCode Account Manager |
| AM Export | `.json` | Export từ app Antigravity Manager `[{email, refresh_token}]` |
| Plugin Native | `.json` | Định dạng `antigravity-accounts.json` |

---

## Đường dẫn cấu hình

| File | Windows | Linux/Mac |
|------|---------|-----------|
| Config OpenCode | `~/.config/opencode/opencode.json` | `~/.config/opencode/opencode.json` |
| Plugin accounts | `%APPDATA%/opencode/antigravity-accounts.json` | `~/.config/opencode/antigravity-accounts.json` |
| Cài đặt OCAM | `%APPDATA%/opencode/ocam-config.json` | `~/.config/opencode/ocam-config.json` |

> **Lưu ý**: `~` trên Windows là thư mục home của user (ví dụ: `C:\Users\TenBan`)

---

## Yêu cầu hệ thống

- **Node.js**: >= 16.x
- **OpenCode**: Đã cài đặt và cấu hình
- **Terminal**: Hỗ trợ Unicode và 256 màu (Windows Terminal, iTerm2, etc.)

---

## Xử lý lỗi

### "command not found: ocam"

```bash
npm install -g opencode-account-manager
```

### "Plugin accounts file not found"

Đăng nhập ít nhất một tài khoản trước:

```bash
opencode auth login
```

### "Cannot find module"

Cài lại package:

```bash
npm uninstall -g opencode-account-manager
npm install -g opencode-account-manager
```

---

## Tài liệu

- [ROADMAP.md](./docs/ROADMAP.md) - Lịch sử phiên bản và kế hoạch
- [BLUEPRINT.md](./docs/BLUEPRINT.md) - Kiến trúc kỹ thuật

---

## Đóng góp

1. Fork repo
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: mo-ta"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## Giấy phép

MIT License. Xem [LICENSE](./LICENSE) để biết chi tiết.

---

## Credits

- [OpenCode](https://opencode.ai) - AI coding assistant mà công cụ này được xây dựng cho
- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Plugin tùy chọn để xác thực Google OAuth
