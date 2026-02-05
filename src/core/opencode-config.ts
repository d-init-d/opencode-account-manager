import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// Types for opencode.json structure
// ============================================================================

export interface ModelLimit {
  context: number;
  output: number;
}

export interface ModelModalities {
  input: string[];
  output: string[];
}

export interface ModelVariant {
  thinkingLevel?: string;
  thinkingConfig?: {
    thinkingBudget?: number;
  };
}

export interface ModelConfig {
  name: string;
  limit?: ModelLimit;
  modalities?: ModelModalities;
  variants?: Record<string, ModelVariant>;
}

export interface ProviderConfig {
  npm?: string;
  name?: string;
  options?: {
    baseURL?: string;
    apiKey?: string;
  };
  models: Record<string, ModelConfig>;
}

export interface McpServerConfig {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  enabled?: boolean;
}

export interface OpencodeConfig {
  $schema?: string;
  plugin?: string[];
  mcp?: Record<string, McpServerConfig>;
  provider?: Record<string, ProviderConfig>;
}

// ============================================================================
// Parsed/Display structures
// ============================================================================

export interface ProviderInfo {
  id: string;
  name: string;
  modelCount: number;
  models: string[];
  type: "builtin" | "custom";
  baseURL?: string;
}

export interface McpServerInfo {
  id: string;
  command: string;
  enabled: boolean;
  hasEnvVars: boolean;
  envVarCount: number;
}

export interface PluginInfo {
  name: string;
  version?: string;
}

export interface OpencodeInfo {
  configPath: string;
  exists: boolean;
  providers: ProviderInfo[];
  mcpServers: McpServerInfo[];
  plugins: PluginInfo[];
  totalModels: number;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the path to opencode.json
 */
export function getOpencodeConfigPath(): string {
  const home = os.homedir();
  // Check .config/opencode first (Unix-style)
  const unixPath = path.join(home, ".config", "opencode", "opencode.json");
  if (fs.existsSync(unixPath)) {
    return unixPath;
  }
  // Fallback to AppData on Windows
  const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  return path.join(appData, "opencode", "opencode.json");
}

/**
 * Read and parse opencode.json
 */
export function readOpencodeConfig(configPath?: string): OpencodeConfig | null {
  const resolvedPath = configPath || getOpencodeConfigPath();
  
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    return JSON.parse(content) as OpencodeConfig;
  } catch {
    return null;
  }
}

/**
 * Parse opencode.json into display-friendly info
 */
export function parseOpencodeInfo(configPath?: string): OpencodeInfo {
  const resolvedPath = configPath || getOpencodeConfigPath();
  const config = readOpencodeConfig(resolvedPath);

  const info: OpencodeInfo = {
    configPath: resolvedPath,
    exists: config !== null,
    providers: [],
    mcpServers: [],
    plugins: [],
    totalModels: 0,
  };

  if (!config) {
    return info;
  }

  // Parse plugins
  if (config.plugin) {
    info.plugins = config.plugin.map((p) => {
      const match = p.match(/^(.+?)(@(.+))?$/);
      return {
        name: match?.[1] || p,
        version: match?.[3],
      };
    });
  }

  // Parse MCP servers
  if (config.mcp) {
    info.mcpServers = Object.entries(config.mcp).map(([id, server]) => {
      const cmd = server.command?.join(" ") || server.url || "N/A";
      return {
        id,
        command: cmd,
        enabled: server.enabled !== false,
        hasEnvVars: !!server.environment,
        envVarCount: server.environment ? Object.keys(server.environment).length : 0,
      };
    });
  }

  // Parse providers
  if (config.provider) {
    info.providers = Object.entries(config.provider).map(([id, provider]) => {
      const modelIds = Object.keys(provider.models);
      const isBuiltin = id === "google" && !provider.npm;
      
      return {
        id,
        name: provider.name || id,
        modelCount: modelIds.length,
        models: modelIds,
        type: isBuiltin ? "builtin" : "custom",
        baseURL: provider.options?.baseURL,
      };
    });

    info.totalModels = info.providers.reduce((sum, p) => sum + p.modelCount, 0);
  }

  return info;
}

/**
 * Get summary stats
 */
export function getConfigSummary(info: OpencodeInfo): {
  providers: number;
  models: number;
  mcpEnabled: number;
  mcpDisabled: number;
  plugins: number;
} {
  const mcpEnabled = info.mcpServers.filter((m) => m.enabled).length;
  const mcpDisabled = info.mcpServers.length - mcpEnabled;

  return {
    providers: info.providers.length,
    models: info.totalModels,
    mcpEnabled,
    mcpDisabled,
    plugins: info.plugins.length,
  };
}
