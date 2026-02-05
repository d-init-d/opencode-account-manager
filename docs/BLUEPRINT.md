# OpenCode Account Manager - Blueprint v0.4.0

## Overview

Technical specification for the **Encrypted Export/Import** feature.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TUI Layer                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard.tsx                                                           │
│    ├── ExportModal.tsx (format selection → folder → password → save)    │
│    ├── ImportModal.tsx (file selection → password → preview → import)   │
│    └── Components:                                                       │
│        ├── FileBrowser.tsx (folder/file selection UI)                   │
│        ├── PasswordInput.tsx (masked password input)                    │
│        └── FormatSelector.tsx (encrypted vs plain)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                              Core Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  crypto.ts          - AES-256-GCM encryption/decryption                 │
│  config-store.ts    - Persist user preferences (last folder, etc.)      │
│  accounts.ts        - Extended with encrypt/decrypt functions           │
│  types.ts           - New types for encrypted files                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Specifications

### 2.1 Encrypted Export File (.ocam)

**Extension:** `.ocam` (OpenCode Account Manager)

**Structure:**
```typescript
interface EncryptedExportFile {
  // Header (not encrypted)
  version: 1;
  format: "encrypted";
  algorithm: "aes-256-gcm";
  
  // Encryption parameters
  salt: string;      // 32 bytes, hex encoded (for key derivation)
  iv: string;        // 12 bytes, hex encoded (initialization vector)
  authTag: string;   // 16 bytes, hex encoded (authentication tag)
  
  // Encrypted payload
  data: string;      // Encrypted JSON, hex encoded
  
  // Metadata (not encrypted)
  exportedAt: number;     // Unix timestamp ms
  accountCount: number;   // Number of accounts (for display)
  exportedFrom: string;   // App identifier
}
```

**Example:**
```json
{
  "version": 1,
  "format": "encrypted",
  "algorithm": "aes-256-gcm",
  "salt": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "iv": "1234567890abcdef12345678",
  "authTag": "fedcba0987654321fedcba0987654321",
  "data": "encrypted_hex_data_here...",
  "exportedAt": 1707123456789,
  "accountCount": 5,
  "exportedFrom": "opencode-account-manager"
}
```

### 2.2 Plain Export File (.json)

Keep existing format for backward compatibility:
```typescript
interface PortableExportFile {
  version: number;
  exportedAt: number;
  exportedFrom: "opencode-account-manager";
  accounts: Account[];
}
```

### 2.3 App Config File

**Location:** `%APPDATA%/opencode/ocam-config.json` (Windows)
            `~/.config/opencode/ocam-config.json` (Linux/Mac)

```typescript
interface AppConfig {
  lastExportFolder?: string;
  lastImportFolder?: string;
  defaultExportFormat?: "encrypted" | "plain";
  recentFolders?: string[];  // Max 5 recent folders
}
```

---

## 3. Encryption Specification

### 3.1 Algorithm: AES-256-GCM

- **Key Derivation:** scrypt (N=16384, r=8, p=1)
- **Key Length:** 256 bits (32 bytes)
- **Salt Length:** 256 bits (32 bytes, random)
- **IV Length:** 96 bits (12 bytes, random)
- **Auth Tag:** 128 bits (16 bytes)

### 3.2 Encryption Flow

```
Password (user input)
    │
    ▼
┌───────────────────────────────────────┐
│  scrypt(password, salt, N=16384)      │
│  Output: 32-byte key                  │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│  AES-256-GCM.encrypt(                 │
│    key: derived_key,                  │
│    iv: random_12_bytes,               │
│    plaintext: JSON.stringify(data),   │
│    aad: none                          │
│  )                                    │
│  Output: ciphertext + authTag         │
└───────────────────────────────────────┘
    │
    ▼
{ salt, iv, authTag, data: ciphertext }
```

### 3.3 Decryption Flow

```
{ salt, iv, authTag, data } + Password
    │
    ▼
┌───────────────────────────────────────┐
│  scrypt(password, salt, N=16384)      │
│  Output: 32-byte key                  │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│  AES-256-GCM.decrypt(                 │
│    key: derived_key,                  │
│    iv: iv,                            │
│    ciphertext: data,                  │
│    authTag: authTag                   │
│  )                                    │
│  Output: plaintext (or throw error)   │
└───────────────────────────────────────┘
    │
    ▼
JSON.parse(plaintext) → Account[]
```

---

## 4. UI Components

### 4.1 ExportModal

**States:**
1. `format-select` - Choose encrypted or plain
2. `folder-select` - Choose destination folder
3. `password-input` - Enter password (only for encrypted)
4. `exporting` - Show progress
5. `success` - Show result
6. `error` - Show error message

**Props:**
```typescript
interface ExportModalProps {
  accounts: Account[];
  onComplete: (filePath: string) => void;
  onCancel: () => void;
}
```

### 4.2 ImportModal

**States:**
1. `file-select` - Choose file to import
2. `password-input` - Enter password (only for .ocam)
3. `preview` - Show accounts to import with conflict info
4. `importing` - Show progress
5. `success` - Show result
6. `error` - Show error message

**Props:**
```typescript
interface ImportModalProps {
  existingAccounts: Account[];
  onComplete: (imported: number, overwritten: number) => void;
  onCancel: () => void;
}
```

### 4.3 FileBrowser

**Features:**
- Quick locations (Current Dir, Desktop, Documents, Recent)
- Folder navigation with arrow keys
- Text input for pasting path
- Filter by extension (for import)
- Show file metadata (size, date, encrypted/plain)

**Props:**
```typescript
interface FileBrowserProps {
  mode: "folder" | "file";
  initialPath?: string;
  extensions?: string[];  // e.g., [".ocam", ".json"]
  onSelect: (path: string) => void;
  onCancel: () => void;
}
```

### 4.4 PasswordInput

**Features:**
- Masked input (show dots)
- Optional confirmation field (for export)
- Password mismatch warning
- Enter to submit, Escape to cancel

**Props:**
```typescript
interface PasswordInputProps {
  mode: "single" | "confirm";
  title?: string;
  warning?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}
```

---

## 5. User Flows

### 5.1 Export Flow

```
[E] pressed
    │
    ▼
┌─────────────────────────────────┐
│  Select export format:          │
│  [1] Encrypted (.ocam)          │
│  [2] Plain JSON                 │
└─────────────────────────────────┘
    │
    ├─── [1] ──────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│  Select folder                  │    │  Select folder                  │
│  (FileBrowser mode="folder")    │    │  (FileBrowser mode="folder")    │
└─────────────────────────────────┘    └─────────────────────────────────┘
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│  Enter password                 │    │  Save file                      │
│  (PasswordInput mode="confirm") │    │  filename: accounts-{date}.json │
└─────────────────────────────────┘    └─────────────────────────────────┘
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│  Encrypt & Save                 │    │  Success message                │
│  filename: accounts-{date}.ocam │    └─────────────────────────────────┘
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Success message                │
└─────────────────────────────────┘
```

### 5.2 Import Flow

```
[I] pressed
    │
    ▼
┌─────────────────────────────────┐
│  Select file                    │
│  (FileBrowser mode="file")      │
│  extensions: [".ocam", ".json"] │
└─────────────────────────────────┘
    │
    ├─── .ocam ────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│  Enter password                 │    │  .json file                     │
│  (PasswordInput mode="single")  │    │  Parse directly                 │
└─────────────────────────────────┘    └─────────────────────────────────┘
    │                                              │
    ├─── Wrong password ───┐                       │
    │                      ▼                       │
    │    ┌─────────────────────────────────┐       │
    │    │  Error: Invalid password        │       │
    │    │  [Try again] [Cancel]           │       │
    │    └─────────────────────────────────┘       │
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Preview accounts                                           │
│  Show: email, exists? (will overwrite)                      │
│  [Enter] Import  [Esc] Cancel                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Import accounts (overwrite)    │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Success: X imported, Y new     │
└─────────────────────────────────┘
```

---

## 6. Implementation Checklist

### Core Layer
- [ ] `src/core/crypto.ts`
  - [ ] `generateSalt(): string`
  - [ ] `generateIV(): string`
  - [ ] `deriveKey(password: string, salt: string): Buffer`
  - [ ] `encrypt(data: object, password: string): EncryptedData`
  - [ ] `decrypt(encrypted: EncryptedData, password: string): object`

- [ ] `src/core/config-store.ts`
  - [ ] `getConfigPath(): string`
  - [ ] `readConfig(): AppConfig`
  - [ ] `writeConfig(config: AppConfig): void`
  - [ ] `updateLastExportFolder(folder: string): void`
  - [ ] `updateLastImportFolder(folder: string): void`
  - [ ] `getRecentFolders(): string[]`

- [ ] `src/core/types.ts`
  - [ ] `EncryptedExportFile` interface
  - [ ] `AppConfig` interface
  - [ ] Update `PortableExportFile.exportedFrom`

- [ ] `src/core/accounts.ts`
  - [ ] `encryptAndExport(accounts: Account[], password: string): EncryptedExportFile`
  - [ ] `decryptAndImport(file: EncryptedExportFile, password: string): Account[]`
  - [ ] `isEncryptedFile(data: unknown): boolean`

### TUI Layer
- [ ] `src/tui/components/PasswordInput.tsx`
  - [ ] Masked input display
  - [ ] Confirm mode (two fields)
  - [ ] Mismatch warning
  - [ ] Enter/Escape handling

- [ ] `src/tui/components/FileBrowser.tsx`
  - [ ] Quick locations list
  - [ ] Folder navigation
  - [ ] Text input for path
  - [ ] File filtering by extension
  - [ ] File metadata display

- [ ] `src/tui/components/ExportModal.tsx`
  - [ ] Format selection step
  - [ ] Folder selection step
  - [ ] Password input step
  - [ ] Export execution
  - [ ] Success/Error display

- [ ] `src/tui/components/ImportModal.tsx`
  - [ ] File selection step
  - [ ] Password input step (if encrypted)
  - [ ] Preview with conflict detection
  - [ ] Import execution
  - [ ] Success/Error display

- [ ] `src/tui/Dashboard.tsx`
  - [ ] Modal state management
  - [ ] Export handler
  - [ ] Import handler

- [ ] `src/tui/components/Menu.tsx`
  - [ ] Update export action
  - [ ] Update import action

- [ ] `src/tui/components/index.ts`
  - [ ] Export new components

---

## 7. Testing

### Manual Test Cases

1. **Export Encrypted**
   - Export 5 accounts with password "test123"
   - Verify .ocam file created
   - Verify file content is encrypted (not readable)

2. **Import Encrypted**
   - Import the exported .ocam file
   - Enter correct password → success
   - Enter wrong password → error with retry option

3. **Export Plain**
   - Export 5 accounts as plain JSON
   - Verify .json file created
   - Verify accounts are readable in file

4. **Import Plain**
   - Import a plain .json file
   - No password required
   - Accounts imported successfully

5. **Overwrite Existing**
   - Export 3 accounts
   - Modify 1 account locally
   - Import the file
   - Verify the account is overwritten

6. **Remember Folder**
   - Export to custom folder
   - Close and reopen app
   - Export again → should show last folder as recent

---

## 8. Security Considerations

1. **Password not stored** - Never save password to disk
2. **Memory cleanup** - Clear password from memory after use
3. **Auth tag verification** - Detect tampered files
4. **No password hints** - Don't store any password metadata
5. **Salt per file** - Each export uses unique salt
6. **Warning on plain export** - Show security warning

---

## 9. Error Handling

| Error | User Message |
|-------|--------------|
| Wrong password | "Invalid password. Please try again." |
| Corrupted file | "File is corrupted or invalid format." |
| File not found | "File not found: {path}" |
| Permission denied | "Cannot write to folder: {path}" |
| Disk full | "Not enough disk space." |
| Invalid JSON | "Invalid file format." |

---

## 10. Dependencies

No new npm packages required. Using Node.js built-in:
- `crypto` - AES-256-GCM, scrypt
- `fs` - File operations
- `path` - Path manipulation
- `os` - Home directory, platform detection
