/**
 * OpenCode Plugin: Antigravity Account Sync
 * 
 * Syncs accounts between Antigravity Manager and OpenCode plugin.
 * - Adds missing accounts from AM to Plugin
 * - Preserves fingerprints and rate limit info
 * - Excludes proxy_disabled accounts
 * - Auto-calculates optimal strategy
 */

import { type Plugin, tool } from "@opencode-ai/plugin"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

// ============================================================================
// TYPES
// ============================================================================

interface AMIndexEntry {
  id: string
  email: string
  name: string
  disabled: boolean
  proxy_disabled: boolean
  created_at?: number
  last_used?: number
}

interface AMAccountsIndex {
  version: string
  accounts: AMIndexEntry[]
  current_account_id?: string
}

interface AMToken {
  access_token?: string
  refresh_token: string
  expires_in?: number
  expiry_timestamp?: number
  token_type?: string
  email?: string
  project_id?: string
}

interface AMAccountDetail {
  id: string
  email: string
  name: string
  token: AMToken
  disabled?: boolean
  disabled_reason?: string
  proxy_disabled?: boolean
  created_at?: number
  last_used?: number
}

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
  enabled?: boolean  // Sync enabled/disabled state from AM
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

interface SyncChanges {
  addedToPlugin: string[]
  removedFromPlugin: string[]
  updatedTokens: string[]
  skipped: string[]
  disabledInPlugin: string[]  // Accounts disabled due to AM disabled state
  enabledInPlugin: string[]   // Accounts re-enabled
}

interface SyncResult {
  success: boolean
  timestamp: number
  pluginAccountsBefore: number
  pluginAccountsAfter: number
  changes: SyncChanges
  newStrategy?: string
  errors: string[]
}

// ============================================================================
// CONFIG
// ============================================================================

function getAMPath(): string {
  return path.join(os.homedir(), '.antigravity_tools')
}

function getPluginPath(): string {
  // opencode-antigravity-auth ALWAYS uses ~/.config/opencode on ALL platforms
  // NOT %APPDATA% on Windows!
  return path.join(os.homedir(), '.config', 'opencode')
}

function getBackupPath(): string {
  return path.join(os.homedir(), '.antigravity-sync-backups')
}

const CONFIG = {
  am: {
    basePath: getAMPath(),
    accountsIndex: 'accounts.json',
    accountsDir: 'accounts'
  },
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
// LOADER
// ============================================================================

async function loadAMAccounts(): Promise<{ index: AMAccountsIndex; details: Map<string, AMAccountDetail> }> {
  const indexPath = path.join(CONFIG.am.basePath, CONFIG.am.accountsIndex)
  const index = await readJSON<AMAccountsIndex>(indexPath)
  
  if (!index) {
    throw new Error(`Cannot read AM accounts index: ${indexPath}`)
  }
  
  const details = new Map<string, AMAccountDetail>()
  
  for (const entry of index.accounts) {
    const detailPath = path.join(CONFIG.am.basePath, CONFIG.am.accountsDir, `${entry.id}.json`)
    const detail = await readJSON<AMAccountDetail>(detailPath)
    if (detail) {
      details.set(entry.email, detail)
    }
  }
  
  return { index, details }
}

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
// MERGER
// ============================================================================

function mergeAccounts(
  amIndex: AMAccountsIndex,
  amDetails: Map<string, AMAccountDetail>,
  pluginFile: PluginAccountsFile
): { accounts: PluginAccount[]; changes: SyncChanges } {
  const changes: SyncChanges = {
    addedToPlugin: [],
    removedFromPlugin: [],
    updatedTokens: [],
    skipped: [],
    disabledInPlugin: [],
    enabledInPlugin: []
  }
  
  const pluginByEmail = new Map(pluginFile.accounts.map(a => [a.email, a]))
  const resultAccounts: PluginAccount[] = []
  
  // Process AM accounts
  for (const entry of amIndex.accounts) {
    const amDetail = amDetails.get(entry.email)
    const pluginAcc = pluginByEmail.get(entry.email)
    
    // Skip if no detail file
    if (!amDetail || !amDetail.token?.refresh_token) {
      changes.skipped.push(entry.email)
      continue
    }
    
    // Check proxy_disabled from DETAIL file (not index - AM GUI only updates detail file!)
    if (amDetail.proxy_disabled) {
      if (pluginAcc) {
        changes.removedFromPlugin.push(entry.email)
      } else {
        changes.skipped.push(entry.email)
      }
      continue
    }
    
    // Determine if account should be enabled (also from detail file)
    const shouldBeEnabled = !amDetail.disabled
    
    if (pluginAcc) {
      // Account exists in both - check if token or enabled state needs update
      const amToken = amDetail.token.refresh_token
      const amLastUsed = amDetail.last_used || 0
      const pluginLastUsed = pluginAcc.lastUsed || 0
      const currentlyEnabled = pluginAcc.enabled !== false  // Default to true if undefined
      
      let updatedAcc = { ...pluginAcc }
      let changed = false
      
      // Check token update
      if (amToken !== pluginAcc.refreshToken && amLastUsed > pluginLastUsed) {
        updatedAcc.refreshToken = amToken
        updatedAcc.lastUsed = Date.now()
        changes.updatedTokens.push(entry.email)
        changed = true
      }
      
      // Check enabled state sync
      if (shouldBeEnabled !== currentlyEnabled) {
        updatedAcc.enabled = shouldBeEnabled
        if (shouldBeEnabled) {
          changes.enabledInPlugin.push(entry.email)
        } else {
          changes.disabledInPlugin.push(entry.email)
        }
        changed = true
      }
      
      resultAccounts.push(changed ? updatedAcc : pluginAcc)
      pluginByEmail.delete(entry.email)
    } else {
      // Account only in AM - add to plugin (only if not disabled)
      if (shouldBeEnabled) {
        resultAccounts.push({
          email: entry.email,
          refreshToken: amDetail.token.refresh_token,
          projectId: amDetail.token.project_id,
          managedProjectId: amDetail.token.project_id,
          addedAt: Date.now(),
          lastUsed: Date.now(),
          fingerprint: generateFingerprint(),
          enabled: true
        })
        changes.addedToPlugin.push(entry.email)
      } else {
        // Skip disabled accounts that aren't in plugin yet
        changes.skipped.push(entry.email)
      }
    }
  }
  
  // Keep plugin-only accounts (not in AM)
  for (const [email, acc] of pluginByEmail) {
    resultAccounts.push(acc)
  }
  
  return { accounts: resultAccounts, changes }
}

// ============================================================================
// WRITER
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
// SYNC ENGINE
// ============================================================================

async function executeSync(): Promise<SyncResult> {
  const errors: string[] = []
  
  try {
    // Load all data
    const { index: amIndex, details: amDetails } = await loadAMAccounts()
    const pluginFile = await loadPluginAccounts()
    const pluginAccountsBefore = pluginFile.accounts.length
    
    // Merge
    const { accounts, changes } = mergeAccounts(amIndex, amDetails, pluginFile)
    
    // Calculate strategy
    const strategy = calculateStrategy(accounts.length)
    
    // Write
    await writePluginAccounts(accounts)
    await writePluginSettings(strategy)
    
    return {
      success: true,
      timestamp: Date.now(),
      pluginAccountsBefore,
      pluginAccountsAfter: accounts.length,
      changes,
      newStrategy: strategy.account_selection_strategy,
      errors
    }
  } catch (error) {
    return {
      success: false,
      timestamp: Date.now(),
      pluginAccountsBefore: 0,
      pluginAccountsAfter: 0,
      changes: {
        addedToPlugin: [],
        removedFromPlugin: [],
        updatedTokens: [],
        skipped: [],
        disabledInPlugin: [],
        enabledInPlugin: []
      },
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}

function formatSyncResult(result: SyncResult): string {
  if (!result.success) {
    return `Sync FAILED:\n${result.errors.join('\n')}`
  }
  
  const lines: string[] = [
    '=== Antigravity Account Sync Complete ===',
    '',
    `Accounts: ${result.pluginAccountsBefore} -> ${result.pluginAccountsAfter}`,
    `Strategy: ${result.newStrategy}`,
    ''
  ]
  
  if (result.changes.addedToPlugin.length > 0) {
    lines.push(`Added (${result.changes.addedToPlugin.length}):`)
    result.changes.addedToPlugin.forEach(e => lines.push(`  + ${e}`))
  }
  
  if (result.changes.updatedTokens.length > 0) {
    lines.push(`Updated tokens (${result.changes.updatedTokens.length}):`)
    result.changes.updatedTokens.forEach(e => lines.push(`  ~ ${e}`))
  }
  
  if (result.changes.removedFromPlugin.length > 0) {
    lines.push(`Removed (${result.changes.removedFromPlugin.length}):`)
    result.changes.removedFromPlugin.forEach(e => lines.push(`  - ${e}`))
  }
  
  if (result.changes.disabledInPlugin.length > 0) {
    lines.push(`Disabled (${result.changes.disabledInPlugin.length}):`)
    result.changes.disabledInPlugin.forEach(e => lines.push(`  x ${e}`))
  }
  
  if (result.changes.enabledInPlugin.length > 0) {
    lines.push(`Re-enabled (${result.changes.enabledInPlugin.length}):`)
    result.changes.enabledInPlugin.forEach(e => lines.push(`  o ${e}`))
  }
  
  if (result.changes.skipped.length > 0) {
    lines.push(`Skipped (${result.changes.skipped.length}):`)
    result.changes.skipped.forEach(e => lines.push(`  . ${e}`))
  }
  
  if (result.changes.addedToPlugin.length === 0 && 
      result.changes.updatedTokens.length === 0 && 
      result.changes.removedFromPlugin.length === 0 &&
      result.changes.disabledInPlugin.length === 0 &&
      result.changes.enabledInPlugin.length === 0) {
    lines.push('No changes needed - accounts already in sync!')
  }
  
  return lines.join('\n')
}

// ============================================================================
// PLUGIN EXPORT
// ============================================================================

export const AntigravitySyncPlugin: Plugin = async (ctx) => {
  // Auto-sync on startup
  console.log('[antigravity-sync] Starting auto-sync...')
  
  try {
    const result = await executeSync()
    
    if (result.success) {
      const added = result.changes.addedToPlugin.length
      const updated = result.changes.updatedTokens.length
      const disabled = result.changes.disabledInPlugin.length
      const enabled = result.changes.enabledInPlugin.length
      const parts = []
      if (added > 0) parts.push(`${added} added`)
      if (updated > 0) parts.push(`${updated} updated`)
      if (disabled > 0) parts.push(`${disabled} disabled`)
      if (enabled > 0) parts.push(`${enabled} enabled`)
      const changesStr = parts.length > 0 ? parts.join(', ') : 'no changes'
      console.log(`[antigravity-sync] Sync complete. ${changesStr}. Total: ${result.pluginAccountsAfter} accounts.`)
    } else {
      console.error(`[antigravity-sync] Sync failed: ${result.errors.join(', ')}`)
    }
  } catch (error) {
    console.error(`[antigravity-sync] Error during startup sync:`, error)
  }
  
  return {
    tool: {
      'sync-accounts': tool({
        description: 'Sync accounts between Antigravity Manager and OpenCode plugin. Adds missing accounts from AM, preserves fingerprints, and auto-sets optimal strategy.',
        args: {},
        async execute(_args, _context) {
          const result = await executeSync()
          return formatSyncResult(result)
        }
      }),
      
      'sync-status': tool({
        description: 'Show current sync status and account comparison between Antigravity Manager and OpenCode plugin.',
        args: {},
        async execute(_args, _context) {
          try {
            const { index: amIndex, details: amDetails } = await loadAMAccounts()
            const pluginFile = await loadPluginAccounts()
            const settings = await loadPluginSettings()
            
            const amEmails = new Set(
              amIndex.accounts
                .filter(a => {
                  const detail = amDetails.get(a.email)
                  // Check proxy_disabled from DETAIL file (not index!)
                  return detail && !detail.proxy_disabled && !detail.disabled
                })
                .map(a => a.email)
            )
            const pluginEmails = new Set(pluginFile.accounts.map(a => a.email))
            
            const inBoth = [...amEmails].filter(e => pluginEmails.has(e))
            const onlyAM = [...amEmails].filter(e => !pluginEmails.has(e))
            const onlyPlugin = [...pluginEmails].filter(e => !amEmails.has(e))
            
            const lines = [
              '=== Antigravity Sync Status ===',
              '',
              `AM accounts (enabled): ${amEmails.size}`,
              `Plugin accounts: ${pluginEmails.size}`,
              `Strategy: ${settings.account_selection_strategy || 'not set'}`,
              `PID offset: ${settings.pid_offset_enabled ? 'enabled' : 'disabled'}`,
              ''
            ]
            
            if (onlyAM.length > 0) {
              lines.push(`Missing in Plugin (${onlyAM.length}):`)
              onlyAM.forEach(e => lines.push(`  - ${e}`))
              lines.push('')
            }
            
            if (onlyPlugin.length > 0) {
              lines.push(`Only in Plugin (${onlyPlugin.length}):`)
              onlyPlugin.forEach(e => lines.push(`  + ${e}`))
              lines.push('')
            }
            
            if (onlyAM.length === 0 && onlyPlugin.length === 0) {
              lines.push('All accounts are in sync!')
            } else {
              lines.push('Run sync-accounts to sync.')
            }
            
            return lines.join('\n')
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      })
    }
  }
}

export default AntigravitySyncPlugin
