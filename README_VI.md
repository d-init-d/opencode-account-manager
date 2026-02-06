# OpenCode Account Manager (OCAM)

<div align="center">
  <h3>TUI Dashboard quản lý tài khoản OpenCode</h3>
  <p>Quản lý providers, MCP servers, và plugin accounts trong một giao diện.</p>
  
  <p>
    <a href="https://www.npmjs.com/package/opencode-account-manager">
      <img src="https://img.shields.io/npm/v/opencode-account-manager.svg" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/opencode-account-manager">
      <img src="https://img.shields.io/npm/dw/opencode-account-manager.svg" alt="npm downloads">
    </a>
    <a href="https://github.com/d-init-d/opencode-account-manager/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
    </a>
  </p>

  <p>
    <a href="./README.md">English</a> | 
    <strong>Tiếng Việt</strong>
  </p>
</div>

---

## Tính năng

- **Xem Providers**: Hiển thị tất cả AI providers (Google, Ollama, Anthropic, etc.) với số lượng models
- **MCP Servers**: Xem trạng thái bật/tắt của các MCP servers
- **Quản lý Accounts**: Quản lý các tài khoản Google đang kết nối với OpenCode
  - Trạng thái rate limit theo từng model (claude, gemini)
  - Bật/Tắt/Xóa accounts
- **Health Check**: Kiểm tra refresh token và báo tài khoản cần xác minh
- **Export mã hóa**: Mã hóa AES-256-GCM với mật khẩu bảo vệ
- **Import đa định dạng**: Hỗ trợ file `.ocam` mã hóa, JSON thuần, và file export từ Antigravity Manager

---

## Cài đặt

### Cách A: Nhờ AI cài giúp

Paste đoạn này vào bất kỳ AI agent nào (Claude Code, OpenCode, Cursor, etc.):

```
Cài đặt opencode-account-manager từ npm, sau đó chạy "ocam" để kiểm tra.
Repository: https://github.com/d-init-d/opencode-account-manager
```

### Cách B: Cài từ npm

```bash
npm install -g opencode-account-manager
```

### Cách C: Cài từ GitHub

```bash
npm install -g github:d-init-d/opencode-account-manager
```

### Kiểm tra cài đặt

```bash
ocam --version
```

---

## Dành cho AI Agents

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

# Export accounts (mã hóa mặc định)
ocam export -o backup.ocam
# Hoặc dùng biến môi trường (non-interactive)
OCAM_EXPORT_PASSWORD="your-password" ocam export -o backup.ocam

# Export dạng plain JSON (cần xác nhận)
ocam export -o backup.json --plain --i-understand

# Import accounts
ocam import backup.ocam

# Import từ thư mục Antigravity Manager
ocam import-am

# Health check
ocam check

# Health check (chỉ định email)
ocam check --emails user1@example.com,user2@example.com

# Health check (bỏ qua cache)
ocam check --force

# Trợ giúp
ocam --help
```

> **Lưu ý bảo mật**:
> - CLI export mặc định dùng mã hóa (AES-256-GCM)
> - Mật khẩu có thể nhập qua biến môi trường `OCAM_EXPORT_PASSWORD` hoặc prompt tương tác
> - Flag `--password` đã bị xóa để bảo mật (tránh lộ mật khẩu trong shell history)
> - Export dạng plain cần cả hai flag `--plain` và `--i-understand`

**Cấu hình OAuth cho Health Check**
Thiết lập credentials qua biến môi trường:

```
OCAM_OAUTH_CLIENT_ID=...
OCAM_OAUTH_CLIENT_SECRET=...
OCAM_OAUTH_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token
```

**Cấu hình bảo mật**
- **OAuth Endpoint Allowlist**: Chỉ cho phép `https://oauth2.googleapis.com/token` mặc định
- **Custom Endpoints**: Đặt `OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT=true` để dùng endpoint khác
- **clientSecret Storage**: OCAM cảnh báo nếu `clientSecret` lưu trong file config (nên dùng biến môi trường)

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
| Portable | `.json` | Export thuần từ OpenCode Account Manager (⚠️ hiển thị cảnh báo bảo mật) |
| AM Export | `.json` | Export từ app Antigravity Manager `[{email, refresh_token}]` |
| Plugin Native | `.json` | Định dạng `antigravity-accounts.json` |

> **Cảnh báo bảo mật**: Export plaintext (`.json`) sẽ hiển thị cảnh báo về việc lộ credential. Export mã hóa (`.ocam`) được khuyến nghị cho môi trường production.

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

### Cảnh báo parse Config

OCAM giờ cảnh báo khi file config không parse được:

```
Warning: Failed to parse opencode.json - Unexpected token ...
Warning: Failed to parse ocam-config.json - ...
```

Các cảnh báo này xuất hiện khi khởi động CLI và giúp xác định vấn đề cấu hình.

### Cảnh báo bảo mật

**clientSecret trong file Config**
```
Warning: OAuth clientSecret should not be stored in ocam-config.json.
Please use OCAM_OAUTH_CLIENT_SECRET environment variable instead.
```

**Custom OAuth Endpoint không được cho phép**
```
Warning: Custom OAuth token endpoint "..." is not in the allowlist.
Set OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT=true to allow custom endpoints.
```

**Cảnh báo Export Plain Text**
```
⚠️  WARNING: Exporting in PLAIN TEXT format.
    Your account credentials will be visible in the output file.
    This is insecure and should only be used for testing/development.
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
