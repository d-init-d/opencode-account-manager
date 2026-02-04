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
  exportedFrom: "antigravity-sync";
  accounts: Account[];
}
