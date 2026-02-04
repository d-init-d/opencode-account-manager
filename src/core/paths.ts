import os from "os";
import path from "path";

export function getConfigRoot(): string {
  if (process.env.APPDATA) {
    return process.env.APPDATA;
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

// Plugin ALWAYS uses ~/.config/opencode on ALL platforms (including Windows)
export function getPluginAccountsPath(customPath?: string): string {
  if (customPath && customPath.trim().length > 0) {
    return path.resolve(customPath);
  }
  return path.join(os.homedir(), ".config", "opencode", "antigravity-accounts.json");
}

// AM uses ~/.antigravity_tools on ALL platforms
export function getAmFolderPath(): string {
  return path.join(os.homedir(), ".antigravity_tools");
}

export function getAmDbPath(customPath?: string): string {
  if (customPath && customPath.trim().length > 0) {
    return path.resolve(customPath);
  }
  return path.join(getConfigRoot(), "antigravity-manager", "accounts.db");
}
