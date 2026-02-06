import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  AccountHealthResult,
  HealthConfig,
  HealthOAuthConfig,
  HealthSettings,
} from "./types";
import { toLowerTrim } from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface ConfigError {
  file: string;
  message: string;
  timestamp: number;
}

export interface AppConfig {
  lastExportFolder?: string;
  lastImportFolder?: string;
  defaultExportFormat?: "encrypted" | "plain";
  recentFolders?: string[];
  health?: HealthConfig;
}

// ============================================================================
// Error State
// ============================================================================

let lastConfigError: ConfigError | null = null;

/**
 * Get the last config parse error, if any
 */
export function getLastConfigError(): ConfigError | null {
  return lastConfigError;
}

/**
 * Clear the last config error
 */
export function clearLastConfigError(): void {
  lastConfigError = null;
}

/**
 * Set a config parse error
 */
function setConfigError(file: string, message: string): void {
  lastConfigError = {
    file,
    message,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILENAME = "ocam-config.json";
const MAX_RECENT_FOLDERS = 5;
const DEFAULT_HEALTH_TTL_MS = 10 * 60 * 1000;
const DEFAULT_HEALTH_COOLDOWN_MS = 60 * 1000;
const DEFAULT_HEALTH_MAX_CONCURRENCY = 3;

// ============================================================================
// Path Functions
// ============================================================================

/**
 * Get the config directory path
 */
function getConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "opencode");
  }
  return path.join(os.homedir(), ".config", "opencode");
}

/**
 * Get the full path to config file
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILENAME);
}

// ============================================================================
// Config Functions
// ============================================================================

/**
 * Read config file, return empty config if not exists
 */
export function readConfig(): AppConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as AppConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parse error";
    setConfigError(configPath, message);
    return {};
  }
}

/**
 * Write config file
 */
export function writeConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Update last export folder and add to recent folders
 */
export function updateLastExportFolder(folder: string): void {
  const config = readConfig();
  config.lastExportFolder = folder;
  config.recentFolders = addToRecentFolders(config.recentFolders || [], folder);
  writeConfig(config);
}

/**
 * Update last import folder and add to recent folders
 */
export function updateLastImportFolder(folder: string): void {
  const config = readConfig();
  config.lastImportFolder = folder;
  config.recentFolders = addToRecentFolders(config.recentFolders || [], folder);
  writeConfig(config);
}

/**
 * Get recent folders list
 */
export function getRecentFolders(): string[] {
  const config = readConfig();
  return config.recentFolders || [];
}

/**
 * Get last export folder or default
 */
export function getLastExportFolder(): string {
  const config = readConfig();
  return config.lastExportFolder || process.cwd();
}

/**
 * Get last import folder or default
 */
export function getLastImportFolder(): string {
  const config = readConfig();
  return config.lastImportFolder || process.cwd();
}

// ============================================================================
// Health Config & Cache
// ============================================================================

export function normalizeHealthKey(email: string): string {
  return toLowerTrim(email);
}

export function getHealthSettings(): Required<HealthSettings> {
  const config = readConfig();
  const settings = config.health?.settings || {};
  return {
    ttlMs: settings.ttlMs ?? DEFAULT_HEALTH_TTL_MS,
    cooldownMs: settings.cooldownMs ?? DEFAULT_HEALTH_COOLDOWN_MS,
    maxConcurrency: settings.maxConcurrency ?? DEFAULT_HEALTH_MAX_CONCURRENCY,
  };
}

export function updateHealthSettings(partial: HealthSettings): void {
  const config = readConfig();
  const health = config.health || {};
  const settings = { ...(health.settings || {}), ...partial };
  writeConfig({
    ...config,
    health: { ...health, settings },
  });
}

export function getHealthOAuthConfig(): HealthOAuthConfig | undefined {
  const config = readConfig();
  return config.health?.oauth;
}

export function updateHealthOAuthConfig(partial: HealthOAuthConfig): void {
  const config = readConfig();
  const health = config.health || {};
  const oauth = { ...(health.oauth || {}), ...partial };
  writeConfig({
    ...config,
    health: { ...health, oauth },
  });
}

export function getHealthCache(): Record<string, AccountHealthResult> {
  const config = readConfig();
  return config.health?.cache ? { ...config.health.cache } : {};
}

export function getCachedHealth(
  email: string,
  ttlMs?: number
): AccountHealthResult | undefined {
  const key = normalizeHealthKey(email);
  const cache = getHealthCache();
  const entry = cache[key];
  if (!entry) return undefined;
  const ttl = ttlMs ?? getHealthSettings().ttlMs;
  if (Date.now() - entry.checkedAt > ttl) return undefined;
  return entry;
}

export function setHealthCacheEntry(email: string, result: AccountHealthResult): void {
  const key = normalizeHealthKey(email);
  const config = readConfig();
  const health: HealthConfig = config.health || {};
  const cache = { ...(health.cache || {}) };
  cache[key] = result;
  writeConfig({
    ...config,
    health: { ...health, cache },
  });
}

export function removeHealthCacheEntry(email: string): void {
  const key = normalizeHealthKey(email);
  const config = readConfig();
  const health: HealthConfig = config.health || {};
  const cache = { ...(health.cache || {}) };
  if (cache[key]) {
    delete cache[key];
    writeConfig({
      ...config,
      health: { ...health, cache },
    });
  }
}

export function clearHealthCache(): void {
  const config = readConfig();
  const health: HealthConfig = config.health || {};
  writeConfig({
    ...config,
    health: { ...health, cache: {} },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add folder to recent list, keeping max items and removing duplicates
 */
function addToRecentFolders(recent: string[], folder: string): string[] {
  // Normalize path
  const normalized = path.normalize(folder);
  
  // Remove if already exists
  const filtered = recent.filter(f => path.normalize(f) !== normalized);
  
  // Add to front
  filtered.unshift(normalized);
  
  // Keep only max items
  return filtered.slice(0, MAX_RECENT_FOLDERS);
}

// ============================================================================
// Quick Locations
// ============================================================================

export interface QuickLocation {
  label: string;
  path: string;
  exists: boolean;
}

/**
 * Get list of quick locations for file browser
 */
export function getQuickLocations(): QuickLocation[] {
  const home = os.homedir();
  const locations: QuickLocation[] = [];

  // Current directory
  locations.push({
    label: "Current Directory",
    path: process.cwd(),
    exists: true,
  });

  // Desktop
  const desktop = path.join(home, "Desktop");
  locations.push({
    label: "Desktop",
    path: desktop,
    exists: fs.existsSync(desktop),
  });

  // Documents
  const documents = path.join(home, "Documents");
  locations.push({
    label: "Documents",
    path: documents,
    exists: fs.existsSync(documents),
  });

  // Downloads
  const downloads = path.join(home, "Downloads");
  locations.push({
    label: "Downloads",
    path: downloads,
    exists: fs.existsSync(downloads),
  });

  // Last export folder (if different from above)
  const config = readConfig();
  if (config.lastExportFolder && fs.existsSync(config.lastExportFolder)) {
    const isAlreadyListed = locations.some(
      loc => path.normalize(loc.path) === path.normalize(config.lastExportFolder!)
    );
    if (!isAlreadyListed) {
      locations.push({
        label: "Recent Export",
        path: config.lastExportFolder,
        exists: true,
      });
    }
  }

  return locations.filter(loc => loc.exists);
}
