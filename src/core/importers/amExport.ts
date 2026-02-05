/**
 * Import accounts from Antigravity Manager EXPORTED files
 * 
 * AM Export Format (from app export button):
 * [
 *   { "email": "xxx@gmail.com", "refresh_token": "1//..." },
 *   ...
 * ]
 * 
 * This is different from AM folder structure (accounts.json + accounts/*.json)
 */

import fs from "fs";
import { Account } from "../types";

/**
 * Single entry in AM export file
 */
export interface AMExportEntry {
  email: string;
  refresh_token: string;
}

/**
 * Type guard to check if data is an AM export file (array of entries)
 */
export function isAMExportFile(data: unknown): data is AMExportEntry[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty array is valid
  
  // Check first few entries to be sure
  const sample = data.slice(0, 3);
  return sample.every(item => 
    typeof item === "object" &&
    item !== null &&
    typeof (item as Record<string, unknown>).email === "string" &&
    typeof (item as Record<string, unknown>).refresh_token === "string"
  );
}

/**
 * Generate a new fingerprint for imported accounts
 */
function generateFingerprint() {
  const randomHex = (len: number) => {
    let result = "";
    for (let i = 0; i < len; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  };

  const platforms = ["win32/x64", "win32/arm64", "darwin/x64", "darwin/arm64"];
  const ides = ["ANDROID_STUDIO", "INTELLIJ", "IDE_UNSPECIFIED"];
  const clients = [
    "google-cloud-sdk android-studio/2024.1",
    "google-cloud-sdk intellij/2024.1",
    "google-cloud-sdk vscode/1.87.0",
  ];

  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  return {
    deviceId: crypto.randomUUID(),
    sessionToken: randomHex(32),
    userAgent: `antigravity/1.15.8 ${platform}`,
    apiClient: clients[Math.floor(Math.random() * clients.length)],
    clientMetadata: {
      ideType: ides[Math.floor(Math.random() * ides.length)],
      platform: platform.startsWith("darwin") ? "MACOS" : "WINDOWS",
      pluginType: "GEMINI",
      osVersion: platform.startsWith("darwin") ? "14.2.1" : "10.0.19042",
      arch: platform.split("/")[1],
      sqmId: `{${crypto.randomUUID().toUpperCase()}}`,
    },
    quotaUser: `device-${randomHex(16)}`,
    createdAt: Date.now(),
  };
}

export interface ImportFromAMExportResult {
  accounts: Account[];
  skipped: string[];
  errors: string[];
  source: "am-export";
}

/**
 * Import accounts from AM export file content
 */
export function importFromAMExportContent(entries: AMExportEntry[]): ImportFromAMExportResult {
  const result: ImportFromAMExportResult = {
    accounts: [],
    skipped: [],
    errors: [],
    source: "am-export",
  };

  for (const entry of entries) {
    // Validate email
    if (!entry.email || !entry.email.includes("@")) {
      result.skipped.push(`Invalid email: ${entry.email || "(empty)"}`);
      continue;
    }

    // Validate refresh_token
    if (!entry.refresh_token || !entry.refresh_token.startsWith("1//")) {
      result.skipped.push(`${entry.email} (invalid or missing refresh_token)`);
      continue;
    }

    // Convert to Plugin account format
    const account: Account = {
      email: entry.email.trim(),
      refreshToken: entry.refresh_token,
      addedAt: Date.now(),
      lastUsed: Date.now(),
      fingerprint: generateFingerprint(),
      enabled: true,
    };

    result.accounts.push(account);
  }

  return result;
}

/**
 * Import accounts from AM export file path
 */
export function importFromAMExportFile(filePath: string): ImportFromAMExportResult {
  const result: ImportFromAMExportResult = {
    accounts: [],
    skipped: [],
    errors: [],
    source: "am-export",
  };

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  // Read and parse file
  let data: unknown;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(content);
  } catch (err) {
    result.errors.push(`Failed to parse file: ${err}`);
    return result;
  }

  // Validate format
  if (!isAMExportFile(data)) {
    result.errors.push("Invalid AM export format. Expected array of {email, refresh_token}");
    return result;
  }

  return importFromAMExportContent(data);
}

/**
 * Check if a file is an AM export file (by reading and checking format)
 */
export function isAMExportFilePath(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return isAMExportFile(data);
  } catch {
    return false;
  }
}
