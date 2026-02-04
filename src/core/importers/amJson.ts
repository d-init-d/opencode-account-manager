/**
 * Import accounts from Antigravity Manager JSON files
 * 
 * AM Structure:
 * ~/.antigravity_tools/
 *   accounts.json          - index file with account list
 *   accounts/<id>.json     - detail files with tokens
 */

import fs from "fs";
import path from "path";
import { Account } from "../types";
import { getAmFolderPath } from "../paths";

interface AMIndexEntry {
  id: string;
  email: string;
  name: string;
  disabled: boolean;
  proxy_disabled: boolean;
  created_at?: number;
  last_used?: number;
}

interface AMAccountsIndex {
  version: string;
  accounts: AMIndexEntry[];
  current_account_id?: string;
}

interface AMToken {
  access_token?: string;
  refresh_token: string;
  expires_in?: number;
  expiry_timestamp?: number;
  token_type?: string;
  email?: string;
  project_id?: string;
}

interface AMAccountDetail {
  id: string;
  email: string;
  name: string;
  token: AMToken;
  device_profile?: Record<string, unknown>;
  disabled?: boolean;
  proxy_disabled?: boolean;
  created_at?: number;
  last_used?: number;
}

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

export interface ImportFromAmResult {
  accounts: Account[];
  skipped: string[];
  errors: string[];
}

export function importFromAmFolder(amPath?: string): ImportFromAmResult {
  const folderPath = amPath || getAmFolderPath();
  const result: ImportFromAmResult = {
    accounts: [],
    skipped: [],
    errors: [],
  };

  // Check if folder exists
  if (!fs.existsSync(folderPath)) {
    result.errors.push(`AM folder not found: ${folderPath}`);
    return result;
  }

  // Read index file
  const indexPath = path.join(folderPath, "accounts.json");
  if (!fs.existsSync(indexPath)) {
    result.errors.push(`AM accounts.json not found: ${indexPath}`);
    return result;
  }

  let index: AMAccountsIndex;
  try {
    const content = fs.readFileSync(indexPath, "utf-8");
    index = JSON.parse(content) as AMAccountsIndex;
  } catch (err) {
    result.errors.push(`Failed to parse accounts.json: ${err}`);
    return result;
  }

  // Process each account
  const accountsDir = path.join(folderPath, "accounts");
  
  for (const entry of index.accounts) {
    // Skip disabled accounts
    if (entry.disabled || entry.proxy_disabled) {
      result.skipped.push(`${entry.email} (disabled)`);
      continue;
    }

    // Read detail file
    const detailPath = path.join(accountsDir, `${entry.id}.json`);
    if (!fs.existsSync(detailPath)) {
      result.skipped.push(`${entry.email} (no detail file)`);
      continue;
    }

    let detail: AMAccountDetail;
    try {
      const content = fs.readFileSync(detailPath, "utf-8");
      detail = JSON.parse(content) as AMAccountDetail;
    } catch (err) {
      result.skipped.push(`${entry.email} (parse error)`);
      continue;
    }

    // Check if has refresh token
    if (!detail.token?.refresh_token) {
      result.skipped.push(`${entry.email} (no refresh token)`);
      continue;
    }

    // Check proxy_disabled in detail file (AM GUI only updates detail file!)
    if (detail.proxy_disabled) {
      result.skipped.push(`${entry.email} (proxy disabled)`);
      continue;
    }

    // Convert to Plugin account format
    const account: Account = {
      email: detail.email,
      refreshToken: detail.token.refresh_token,
      projectId: detail.token.project_id,
      managedProjectId: detail.token.project_id,
      addedAt: Date.now(),
      lastUsed: Date.now(),
      fingerprint: generateFingerprint(),
    };

    result.accounts.push(account);
  }

  return result;
}

export function isAmFolder(folderPath: string): boolean {
  const indexPath = path.join(folderPath, "accounts.json");
  const accountsDir = path.join(folderPath, "accounts");
  return fs.existsSync(indexPath) && fs.existsSync(accountsDir);
}
