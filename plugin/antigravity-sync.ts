/**
 * OpenCode Plugin: Antigravity Account Manager
 * 
 * Manage OpenCode Antigravity Auth accounts directly from chat.
 * - List accounts with rate limit status
 * - View summary statistics
 * - Export/Import accounts for backup
 */

import { type Plugin, tool } from "@opencode-ai/plugin"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

// ============================================================================
// TYPES
// ============================================================================

interface PluginFingerprint {
  deviceId?: string
  sessionToken?: string
  userAgent?: string
  apiClient?: string
  clientMetadata?: Record<string, unknown>
  quotaUser?: string
  createdAt?: number
}

interface PluginAccount {
  email: string
  refreshToken: string
  projectId?: string
  managedProjectId?: string
  addedAt?: number
  lastUsed?: number
  rateLimitResetTimes?: Record<string, number>
  fingerprint?: PluginFingerprint
  fingerprintHistory?: unknown[]
  enabled?: boolean
}

interface PluginAccountsFile {
  version: number
  accounts: PluginAccount[]
  activeIndex?: number
  activeIndexByFamily?: Record<string, number>
}

interface PluginSettings {
  pid_offset_enabled?: boolean
  account_selection_strategy?: 'sticky' | 'hybrid' | 'round-robin'
  debug?: boolean
  quiet?: boolean
}

// ============================================================================
// CONFIG
// ============================================================================

function getPluginPath(): string {
  // opencode-antigravity-auth ALWAYS uses ~/.config/opencode on ALL platforms
  return path.join(os.homedir(), '.config', 'opencode')
}

function getBackupPath(): string {
  return path.join(os.homedir(), '.antigravity-sync-backups')
}

const CONFIG = {
  plugin: {
    basePath: getPluginPath(),
    accountsFile: 'antigravity-accounts.json',
    settingsFile: 'antigravity.json'
  },
  backup: {
    dir: getBackupPath(),
    maxCount: 5
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

async function backupFile(filePath: string): Promise<string | null> {
  if (!await fileExists(filePath)) return null
  
  await fs.mkdir(CONFIG.backup.dir, { recursive: true })
  const filename = path.basename(filePath)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(CONFIG.backup.dir, `${filename}.${timestamp}.bak`)
  
  await fs.copyFile(filePath, backupPath)
  await cleanupOldBackups(filename)
  return backupPath
}

async function cleanupOldBackups(filename: string): Promise<void> {
  try {
    const files = await fs.readdir(CONFIG.backup.dir)
    const backups = files
      .filter(f => f.startsWith(filename) && f.endsWith('.bak'))
      .sort()
      .reverse()
    
    for (let i = CONFIG.backup.maxCount; i < backups.length; i++) {
      await fs.unlink(path.join(CONFIG.backup.dir, backups[i]))
    }
  } catch {
    // Ignore cleanup errors
  }
}

function generateFingerprint(): PluginFingerprint {
  const randomHex = (len: number) => {
    let result = ''
    for (let i = 0; i < len; i++) {
      result += Math.floor(Math.random() * 16).toString(16)
    }
    return result
  }
  
  const platforms = ['win32/x64', 'win32/arm64', 'darwin/x64', 'darwin/arm64']
  const ides = ['ANDROID_STUDIO', 'INTELLIJ', 'IDE_UNSPECIFIED']
  const clients = [
    'google-cloud-sdk android-studio/2024.1',
    'google-cloud-sdk intellij/2024.1',
    'google-cloud-sdk vscode/1.87.0',
    'gcloud-python/1.2.0 grpc-google-iam-v1/0.12.6'
  ]
  
  const platform = platforms[Math.floor(Math.random() * platforms.length)]
  
  return {
    deviceId: crypto.randomUUID(),
    sessionToken: randomHex(32),
    userAgent: `antigravity/1.15.8 ${platform}`,
    apiClient: clients[Math.floor(Math.random() * clients.length)],
    clientMetadata: {
      ideType: ides[Math.floor(Math.random() * ides.length)],
      platform: platform.startsWith('darwin') ? 'MACOS' : 'WINDOWS',
      pluginType: 'GEMINI',
      osVersion: platform.startsWith('darwin') ? '14.2.1' : '10.0.19042',
      arch: platform.split('/')[1],
      sqmId: `{${crypto.randomUUID().toUpperCase()}}`
    },
    quotaUser: `device-${randomHex(16)}`,
    createdAt: Date.now()
  }
}

function calculateStrategy(accountCount: number): PluginSettings {
  if (accountCount <= 1) {
    return { account_selection_strategy: 'sticky', pid_offset_enabled: false }
  } else if (accountCount <= 3) {
    return { account_selection_strategy: 'hybrid', pid_offset_enabled: false }
  } else {
    return { account_selection_strategy: 'round-robin', pid_offset_enabled: true }
  }
}

// ============================================================================
// LOADERS
// ============================================================================

async function loadPluginAccounts(): Promise<PluginAccountsFile> {
  const filePath = path.join(CONFIG.plugin.basePath, CONFIG.plugin.accountsFile)
  const data = await readJSON<PluginAccountsFile>(filePath)
  
  if (!data) {
    return { version: 3, accounts: [] }
  }
  
  // Handle legacy format (array directly)
  if (Array.isArray(data)) {
    return { version: 3, accounts: data as unknown as PluginAccount[] }
  }
  
  return data
}

async function loadPluginSettings(): Promise<PluginSettings> {
  const filePath = path.join(CONFIG.plugin.basePath, CONFIG.plugin.settingsFile)
  const data = await readJSON<PluginSettings>(filePath)
  return data || {}
}

// ============================================================================
// WRITERS
// ============================================================================

async function writePluginAccounts(accounts: PluginAccount[]): Promise<void> {
  const filePath = path.join(CONFIG.plugin.basePath, CONFIG.plugin.accountsFile)
  await backupFile(filePath)
  
  const data: PluginAccountsFile = {
    version: 3,
    accounts,
    activeIndex: 0,
    activeIndexByFamily: {}
  }
  
  await writeJSON(filePath, data)
}

async function writePluginSettings(settings: PluginSettings): Promise<void> {
  const filePath = path.join(CONFIG.plugin.basePath, CONFIG.plugin.settingsFile)
  const existing = await loadPluginSettings()
  
  const merged = {
    ...existing,
    ...settings
  }
  
  await writeJSON(filePath, merged)
}

// ============================================================================
// PLUGIN EXPORT
// ============================================================================

export const AntigravitySyncPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      'account-list': tool({
        description: 'List all accounts with their status (available/rate-limited). Shows email, status, and reset time if limited.',
        args: {},
        async execute(_args, _context) {
          try {
            const pluginFile = await loadPluginAccounts()
            const now = Date.now()
            
            if (pluginFile.accounts.length === 0) {
              return 'No accounts found. Use `opencode auth login` to add accounts.'
            }
            
            const lines = [
              '=== Account List ===',
              ''
            ]
            
            let available = 0
            let limited = 0
            
            for (const acc of pluginFile.accounts) {
              const resets = acc.rateLimitResetTimes || {}
              const limitedModels: string[] = []
              
              for (const [model, resetTime] of Object.entries(resets)) {
                if (resetTime > now) {
                  const hoursLeft = ((resetTime - now) / 3600000).toFixed(1)
                  limitedModels.push(`${model}: ${hoursLeft}h`)
                }
              }
              
              const enabledStr = acc.enabled === false ? ' [DISABLED]' : ''
              
              if (limitedModels.length > 0) {
                limited++
                lines.push(`[LIMITED] ${acc.email}${enabledStr}`)
                limitedModels.forEach(m => lines.push(`          └─ ${m}`))
              } else {
                available++
                lines.push(`[  OK  ] ${acc.email}${enabledStr}`)
              }
            }
            
            lines.push('')
            lines.push(`Summary: ${available} available, ${limited} rate-limited, ${pluginFile.accounts.length} total`)
            
            return lines.join('\n')
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      }),

      'account-status': tool({
        description: 'Show summary statistics of accounts (total, available, rate-limited counts).',
        args: {},
        async execute(_args, _context) {
          try {
            const pluginFile = await loadPluginAccounts()
            const settings = await loadPluginSettings()
            const now = Date.now()
            
            let available = 0
            let limited = 0
            let disabled = 0
            
            for (const acc of pluginFile.accounts) {
              if (acc.enabled === false) {
                disabled++
                continue
              }
              
              const resets = acc.rateLimitResetTimes || {}
              const isLimited = Object.values(resets).some(t => t > now)
              
              if (isLimited) {
                limited++
              } else {
                available++
              }
            }
            
            const lines = [
              '=== Account Status ===',
              '',
              `Total accounts: ${pluginFile.accounts.length}`,
              `  Available:    ${available}`,
              `  Rate-limited: ${limited}`,
              `  Disabled:     ${disabled}`,
              '',
              `Strategy: ${settings.account_selection_strategy || 'not set'}`,
              `PID offset: ${settings.pid_offset_enabled ? 'enabled' : 'disabled'}`
            ]
            
            return lines.join('\n')
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      }),

      'account-export': tool({
        description: 'Export accounts to a JSON file. Creates a portable backup that can be imported later.',
        args: {
          filePath: tool.schema.string().optional().describe('Output file path. Defaults to ~/antigravity-accounts-export.json')
        },
        async execute(args, _context) {
          try {
            const pluginFile = await loadPluginAccounts()
            
            if (pluginFile.accounts.length === 0) {
              return 'No accounts to export.'
            }
            
            const exportData = {
              version: 1,
              exportedAt: Date.now(),
              exportedFrom: 'antigravity-sync',
              accounts: pluginFile.accounts
            }
            
            const outputPath = args.filePath || path.join(os.homedir(), 'antigravity-accounts-export.json')
            await writeJSON(outputPath, exportData)
            
            return `Exported ${pluginFile.accounts.length} accounts to:\n${outputPath}`
          } catch (error) {
            return `Export failed: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      }),

      'account-import': tool({
        description: 'Import accounts from a JSON file. Supports merge (add new, keep existing) or replace mode.',
        args: {
          filePath: tool.schema.string().describe('Path to the JSON file to import'),
          mode: tool.schema.enum(['merge', 'replace']).optional().describe('Import mode: merge (default) or replace')
        },
        async execute(args, _context) {
          try {
            const importPath = args.filePath
            
            if (!await fileExists(importPath)) {
              return `File not found: ${importPath}`
            }
            
            const importData = await readJSON<any>(importPath)
            
            if (!importData) {
              return 'Failed to read import file or file is empty.'
            }
            
            // Extract accounts from various formats
            let incomingAccounts: PluginAccount[] = []
            
            if (Array.isArray(importData)) {
              incomingAccounts = importData.filter((a: any) => a.email && a.refreshToken)
            } else if (importData.accounts && Array.isArray(importData.accounts)) {
              incomingAccounts = importData.accounts.filter((a: any) => a.email && a.refreshToken)
            } else {
              return 'Invalid import format. Expected {accounts: [...]} or array of accounts.'
            }
            
            if (incomingAccounts.length === 0) {
              return 'No valid accounts found in import file.'
            }
            
            const mode = args.mode || 'merge'
            const pluginFile = await loadPluginAccounts()
            const accountsBefore = pluginFile.accounts.length
            
            // Backup before import
            const pluginPath = path.join(CONFIG.plugin.basePath, CONFIG.plugin.accountsFile)
            await backupFile(pluginPath)
            
            let resultAccounts: PluginAccount[]
            let added = 0
            let updated = 0
            
            if (mode === 'replace') {
              resultAccounts = incomingAccounts.map(acc => ({
                ...acc,
                fingerprint: acc.fingerprint || generateFingerprint()
              }))
              added = resultAccounts.length
            } else {
              // Merge mode
              const byEmail = new Map(pluginFile.accounts.map(a => [a.email.toLowerCase(), a]))
              
              for (const acc of incomingAccounts) {
                const key = acc.email.toLowerCase()
                const existing = byEmail.get(key)
                
                if (existing) {
                  // Update existing - keep fingerprint, update token if newer
                  byEmail.set(key, {
                    ...existing,
                    refreshToken: acc.refreshToken || existing.refreshToken,
                    lastUsed: Date.now()
                  })
                  updated++
                } else {
                  // Add new
                  byEmail.set(key, {
                    ...acc,
                    fingerprint: acc.fingerprint || generateFingerprint(),
                    addedAt: Date.now()
                  })
                  added++
                }
              }
              
              resultAccounts = Array.from(byEmail.values())
            }
            
            await writePluginAccounts(resultAccounts)
            
            // Update strategy
            const strategy = calculateStrategy(resultAccounts.length)
            await writePluginSettings(strategy)
            
            const lines = [
              '=== Import Complete ===',
              '',
              `Mode: ${mode}`,
              `Accounts before: ${accountsBefore}`,
              `Accounts after: ${resultAccounts.length}`,
              `Added: ${added}`,
              `Updated: ${updated}`,
              `Strategy set to: ${strategy.account_selection_strategy}`
            ]
            
            return lines.join('\n')
          } catch (error) {
            return `Import failed: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      })
    }
  }
}

export default AntigravitySyncPlugin
