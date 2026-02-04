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

export interface Account {
  email: string;
  refreshToken?: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt?: number;
  lastUsed?: number;
  rateLimitResetTimes?: RateLimitResetTimes;
  fingerprint?: AccountFingerprint;
  fingerprintHistory?: unknown[];
  enabled?: boolean;
}

export interface PluginAccountsFile {
  version: number;
  accounts: Account[];
  activeIndex?: number;
  activeIndexByFamily?: Record<string, number>;
}

export type ThemeMode = "light" | "dark" | "auto";
export type Language = "vi" | "en";

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  trayEnabled: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}
