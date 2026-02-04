import fs from "fs";
import path from "path";
import {
  Account,
  PluginAccountsFile,
  PortableExportFile,
  RateLimitResetTimes,
} from "./types";
import { getPluginAccountsPath } from "./paths";
import { readJsonFile, toLowerTrim, writeJsonFile } from "./utils";

export type MergeMode = "merge" | "replace";
export type ImportFormat = "portable" | "plugin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAccountCandidate(value: unknown): value is Account {
  if (!isRecord(value)) return false;
  if (typeof value.email !== "string") return false;
  return value.email.includes("@");
}

function normalizeAccount(account: Account): Account {
  return {
    ...account,
    email: account.email.trim(),
  };
}

export function normalizePluginAccounts(data: PluginAccountsFile): PluginAccountsFile {
  const accounts = Array.isArray(data.accounts)
    ? data.accounts.filter(isAccountCandidate).map(normalizeAccount)
    : [];

  return {
    version: typeof data.version === "number" ? data.version : 3,
    accounts,
    activeIndex: typeof data.activeIndex === "number" ? data.activeIndex : undefined,
    activeIndexByFamily:
      data.activeIndexByFamily && isRecord(data.activeIndexByFamily)
        ? (data.activeIndexByFamily as Record<string, number>)
        : undefined,
  };
}

export function createEmptyPluginAccountsFile(): PluginAccountsFile {
  return {
    version: 3,
    accounts: [],
    activeIndex: 0,
    activeIndexByFamily: {},
  };
}

export function readPluginAccountsFile(filePath?: string): PluginAccountsFile {
  const resolvedPath = getPluginAccountsPath(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Plugin accounts file not found at ${resolvedPath}. ` +
        "Login at least one account first or provide --plugin-path."
    );
  }
  const data = readJsonFile<PluginAccountsFile>(resolvedPath);
  return normalizePluginAccounts(data);
}

export function writePluginAccountsFile(
  filePath: string | undefined,
  data: PluginAccountsFile
): void {
  const resolvedPath = getPluginAccountsPath(filePath);
  const normalized = normalizePluginAccounts(data);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  writeJsonFile(resolvedPath, normalized);
}

function mergeRateLimits(
  existing?: RateLimitResetTimes,
  incoming?: RateLimitResetTimes
): RateLimitResetTimes | undefined {
  if (!existing && !incoming) return undefined;
  return { ...(existing || {}), ...(incoming || {}) };
}

function mergeFingerprintHistory(
  existing?: Account["fingerprintHistory"],
  incoming?: Account["fingerprintHistory"]
): Account["fingerprintHistory"] | undefined {
  if (!existing && !incoming) return undefined;
  const list = [...(existing || []), ...(incoming || [])];
  return list.length > 0 ? list : undefined;
}

export function mergeAccount(existing: Account, incoming: Account): Account {
  return {
    ...existing,
    ...incoming,
    email: incoming.email || existing.email,
    refreshToken: incoming.refreshToken || existing.refreshToken,
    fingerprint: incoming.fingerprint || existing.fingerprint,
    rateLimitResetTimes: mergeRateLimits(
      existing.rateLimitResetTimes,
      incoming.rateLimitResetTimes
    ),
    fingerprintHistory: mergeFingerprintHistory(
      existing.fingerprintHistory,
      incoming.fingerprintHistory
    ),
  };
}

export function mergeAccounts(
  existingFile: PluginAccountsFile,
  incomingAccounts: Account[],
  mode: MergeMode
): PluginAccountsFile {
  const base = normalizePluginAccounts(existingFile);
  const incoming = incomingAccounts
    .filter(isAccountCandidate)
    .map(normalizeAccount);

  if (mode === "replace") {
    return {
      version: base.version || 3,
      accounts: incoming,
      activeIndex: 0,
      activeIndexByFamily: {},
    };
  }

  const byEmail = new Map<string, Account>();
  for (const account of base.accounts) {
    byEmail.set(toLowerTrim(account.email), account);
  }

  for (const account of incoming) {
    const key = toLowerTrim(account.email);
    const existing = byEmail.get(key);
    if (existing) {
      byEmail.set(key, mergeAccount(existing, account));
    } else {
      byEmail.set(key, account);
    }
  }

  return {
    ...base,
    accounts: Array.from(byEmail.values()),
  };
}

export function buildPortableExport(accounts: Account[]): PortableExportFile {
  return {
    version: 1,
    exportedAt: Date.now(),
    exportedFrom: "antigravity-sync",
    accounts: accounts.map(normalizeAccount),
  };
}

export function detectImportFormat(data: unknown): ImportFormat | "unknown" {
  if (!isRecord(data)) return "unknown";
  if (data.exportedFrom === "antigravity-sync") return "portable";
  if (typeof data.version === "number" && Array.isArray(data.accounts)) {
    return "plugin";
  }
  return "unknown";
}

export function extractAccountsFromImport(
  data: unknown,
  format?: ImportFormat
): Account[] {
  if (Array.isArray(data)) {
    return data.filter(isAccountCandidate).map(normalizeAccount);
  }
  if (!isRecord(data)) {
    throw new Error("Import data must be an object or an array of accounts.");
  }
  const detected = format || detectImportFormat(data);
  if (detected === "unknown") {
    throw new Error("Unsupported import format. Provide a portable export or plugin file.");
  }
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  return accounts.filter(isAccountCandidate).map(normalizeAccount);
}

export function sanitizeAccountForPublic(account: Account): Account {
  const { refreshToken, ...rest } = account;
  return rest;
}

export function summarizeAccounts(accounts: Account[]): {
  total: number;
  limited: number;
  available: number;
} {
  const now = Date.now();
  let limited = 0;
  for (const account of accounts) {
    const resets = account.rateLimitResetTimes || {};
    const isLimited = Object.values(resets).some((value) => value > now);
    if (isLimited) limited += 1;
  }
  return {
    total: accounts.length,
    limited,
    available: accounts.length - limited,
  };
}
