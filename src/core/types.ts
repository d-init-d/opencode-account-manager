export type RateLimitResetTimes = Record<string, number>;

export interface AccountFingerprint {
  deviceId?: string;
  sessionToken?: string;
  userAgent?: string;
  apiClient?: string;
  clientMetadata?: Record<string, unknown>;
  quotaUser?: string;
  createdAt?: number;
}

export interface FingerprintHistoryEntry {
  fingerprint: AccountFingerprint;
  timestamp: number;
  reason?: string;
}

export interface Account {
  email: string;
  refreshToken?: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt?: number;
  lastUsed?: number;
  rateLimitResetTimes?: RateLimitResetTimes;
  fingerprint?: AccountFingerprint;
  fingerprintHistory?: FingerprintHistoryEntry[];
  enabled?: boolean;
}

export interface PluginAccountsFile {
  version: number;
  accounts: Account[];
  activeIndex?: number;
  activeIndexByFamily?: Record<string, number>;
}

export interface PortableExportFile {
  version: number;
  exportedAt: number;
  exportedFrom: "opencode-account-manager" | "antigravity-sync";
  accounts: Account[];
}

// ============================================================================
// Encrypted Export Types (v0.4.0)
// ============================================================================

export interface EncryptedExportFile {
  // Header (not encrypted)
  version: 1;
  format: "encrypted";
  algorithm: "aes-256-gcm";
  
  // Encryption parameters (hex encoded)
  salt: string;
  iv: string;
  authTag: string;
  
  // Encrypted payload (hex encoded JSON)
  data: string;
  
  // Metadata (not encrypted, for display)
  exportedAt: number;
  accountCount: number;
  exportedFrom: "opencode-account-manager";
}

/**
 * Type guard to check if data is an encrypted export file
 */
export function isEncryptedExportFile(data: unknown): data is EncryptedExportFile {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format === "encrypted" &&
    obj.algorithm === "aes-256-gcm" &&
    typeof obj.salt === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.authTag === "string" &&
    typeof obj.data === "string"
  );
}

/**
 * Type guard to check if data is a portable export file
 */
export function isPortableExportFile(data: unknown): data is PortableExportFile {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === "number" &&
    typeof obj.exportedAt === "number" &&
    Array.isArray(obj.accounts)
  );
}

// ============================================================================
// Export Format Types
// ============================================================================

export type ExportFormat = "encrypted" | "plain";

export interface ExportOptions {
  format: ExportFormat;
  folder: string;
  password?: string; // Required for encrypted
  accounts: Account[];
}

export interface ImportResult {
  success: boolean;
  accounts: Account[];
  newCount: number;
  overwrittenCount: number;
  error?: string;
}
