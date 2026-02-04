#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct AccountFingerprint {
    device_id: Option<String>,
    session_token: Option<String>,
    user_agent: Option<String>,
    api_client: Option<String>,
    client_metadata: Option<HashMap<String, serde_json::Value>>,
    quota_user: Option<String>,
    created_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct Account {
    email: String,
    refresh_token: Option<String>,
    project_id: Option<String>,
    managed_project_id: Option<String>,
    added_at: Option<u64>,
    last_used: Option<u64>,
    rate_limit_reset_times: Option<HashMap<String, u64>>,
    fingerprint: Option<AccountFingerprint>,
    fingerprint_history: Option<Vec<serde_json::Value>>,
    enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct PluginAccountsFile {
    version: u32,
    accounts: Vec<Account>,
    active_index: Option<u32>,
    active_index_by_family: Option<HashMap<String, u32>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    theme: String,
    language: String,
    tray_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ImportResult {
    imported: usize,
    skipped: usize,
    total: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct AmIndexEntry {
    id: String,
    email: String,
    disabled: bool,
    proxy_disabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AmIndexFile {
    accounts: Vec<AmIndexEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AmToken {
    refresh_token: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AmAccountDetail {
    email: String,
    token: Option<AmToken>,
    proxy_disabled: Option<bool>,
    disabled: Option<bool>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .map(PathBuf::from)
        .or_else(|_| std::env::var("USERPROFILE").map(PathBuf::from))
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn plugin_accounts_path() -> PathBuf {
    home_dir()
        .join(".config")
        .join("opencode")
        .join("antigravity-accounts.json")
}

fn settings_path() -> PathBuf {
    home_dir()
        .join(".config")
        .join("opencode")
        .join("antigravity-account-manager.json")
}

fn backup_dir() -> PathBuf {
    home_dir().join(".antigravity-sync-backups")
}

fn am_folder_path() -> PathBuf {
    home_dir().join(".antigravity_tools")
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    ensure_parent(path)?;
    let data = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

fn default_accounts() -> PluginAccountsFile {
    PluginAccountsFile {
        version: 3,
        accounts: vec![],
        active_index: Some(0),
        active_index_by_family: Some(HashMap::new()),
    }
}

fn read_accounts_file() -> Result<PluginAccountsFile, String> {
    let path = plugin_accounts_path();
    if !path.exists() {
        return Ok(default_accounts());
    }
    let value: serde_json::Value = read_json(&path)?;
    if value.is_array() {
        let accounts: Vec<Account> = serde_json::from_value(value).map_err(|e| e.to_string())?;
        return Ok(PluginAccountsFile {
            version: 3,
            accounts,
            active_index: Some(0),
            active_index_by_family: Some(HashMap::new()),
        });
    }
    serde_json::from_value(value).map_err(|e| e.to_string())
}

fn backup_accounts() -> Result<(), String> {
    let path = plugin_accounts_path();
    if !path.exists() {
        return Ok(());
    }
    let filename = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("antigravity-accounts.json");
    let timestamp = now_ms();
    let backup_path = backup_dir().join(format!("{}-{}.bak", filename, timestamp));
    ensure_parent(&backup_path)?;
    fs::copy(path, backup_path).map_err(|e| e.to_string())?;
    Ok(())
}

fn write_accounts_file(file: &PluginAccountsFile) -> Result<(), String> {
    backup_accounts()?;
    write_json(&plugin_accounts_path(), file)
}

fn generate_fingerprint() -> AccountFingerprint {
    let platforms = ["win32/x64", "win32/arm64", "darwin/x64", "darwin/arm64"];
    let ides = ["ANDROID_STUDIO", "INTELLIJ", "IDE_UNSPECIFIED"];
    let clients = [
        "google-cloud-sdk android-studio/2024.1",
        "google-cloud-sdk intellij/2024.1",
        "google-cloud-sdk vscode/1.87.0",
    ];
    let mut rng = rand::thread_rng();
    let platform = platforms[rng.gen_range(0..platforms.len())];
    let ide = ides[rng.gen_range(0..ides.len())];
    let api_client = clients[rng.gen_range(0..clients.len())];
    let mut client_metadata = HashMap::new();
    client_metadata.insert(
        "ideType".to_string(),
        serde_json::Value::String(ide.to_string()),
    );
    client_metadata.insert(
        "platform".to_string(),
        serde_json::Value::String(if platform.starts_with("darwin") {
            "MACOS".to_string()
        } else {
            "WINDOWS".to_string()
        }),
    );
    client_metadata.insert(
        "pluginType".to_string(),
        serde_json::Value::String("GEMINI".to_string()),
    );
    client_metadata.insert(
        "osVersion".to_string(),
        serde_json::Value::String(if platform.starts_with("darwin") {
            "14.2.1".to_string()
        } else {
            "10.0.19042".to_string()
        }),
    );
    client_metadata.insert(
        "arch".to_string(),
        serde_json::Value::String(platform.split('/').nth(1).unwrap_or("x64").to_string()),
    );
    client_metadata.insert(
        "sqmId".to_string(),
        serde_json::Value::String(format!("{{{}}}", Uuid::new_v4()).to_uppercase()),
    );

    AccountFingerprint {
        device_id: Some(Uuid::new_v4().to_string()),
        session_token: Some(
            (0..32)
                .map(|_| rng.gen_range(0..16))
                .map(|v| format!("{:x}", v))
                .collect(),
        ),
        user_agent: Some(format!("antigravity/1.15.8 {}", platform)),
        api_client: Some(api_client.to_string()),
        client_metadata: Some(client_metadata),
        quota_user: Some(format!("device-{}", Uuid::new_v4().simple())),
        created_at: Some(now_ms()),
    }
}

fn merge_account(existing: &Account, incoming: &Account) -> Account {
    Account {
        email: if incoming.email.is_empty() {
            existing.email.clone()
        } else {
            incoming.email.clone()
        },
        refresh_token: incoming
            .refresh_token
            .clone()
            .or_else(|| existing.refresh_token.clone()),
        project_id: incoming
            .project_id
            .clone()
            .or_else(|| existing.project_id.clone()),
        managed_project_id: incoming
            .managed_project_id
            .clone()
            .or_else(|| incoming.project_id.clone())
            .or_else(|| existing.managed_project_id.clone()),
        added_at: existing.added_at.or(incoming.added_at),
        last_used: incoming.last_used.or(existing.last_used),
        rate_limit_reset_times: incoming
            .rate_limit_reset_times
            .clone()
            .or_else(|| existing.rate_limit_reset_times.clone()),
        fingerprint: incoming
            .fingerprint
            .clone()
            .or_else(|| existing.fingerprint.clone()),
        fingerprint_history: incoming
            .fingerprint_history
            .clone()
            .or_else(|| existing.fingerprint_history.clone()),
        enabled: incoming.enabled.or(existing.enabled).or(Some(true)),
    }
}

fn merge_accounts(
    existing: PluginAccountsFile,
    incoming: Vec<Account>,
    mode: &str,
) -> PluginAccountsFile {
    if mode == "replace" {
        return PluginAccountsFile {
            version: existing.version,
            accounts: incoming,
            active_index: Some(0),
            active_index_by_family: Some(HashMap::new()),
        };
    }

    let mut by_email: HashMap<String, Account> = HashMap::new();
    for acc in existing.accounts {
        by_email.insert(acc.email.to_lowercase(), acc);
    }

    for acc in incoming {
        let key = acc.email.to_lowercase();
        if let Some(existing_acc) = by_email.get(&key) {
            let merged = merge_account(existing_acc, &acc);
            by_email.insert(key, merged);
        } else {
            by_email.insert(key, acc);
        }
    }

    PluginAccountsFile {
        version: existing.version,
        accounts: by_email.values().cloned().collect(),
        active_index: Some(0),
        active_index_by_family: Some(HashMap::new()),
    }
}

fn import_from_am_folder(folder: &Path) -> Result<(Vec<Account>, usize), String> {
    let index_path = folder.join("accounts.json");
    let accounts_dir = folder.join("accounts");
    if !index_path.exists() {
        return Err("AM accounts.json not found".to_string());
    }
    let index: AmIndexFile = read_json(&index_path)?;
    let mut accounts = Vec::new();
    let mut skipped = 0;

    for entry in index.accounts {
        if entry.disabled || entry.proxy_disabled {
            skipped += 1;
            continue;
        }
        let detail_path = accounts_dir.join(format!("{}.json", entry.id));
        if !detail_path.exists() {
            skipped += 1;
            continue;
        }
        let detail: AmAccountDetail = match read_json(&detail_path) {
            Ok(val) => val,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };
        if detail.proxy_disabled.unwrap_or(false) || detail.disabled.unwrap_or(false) {
            skipped += 1;
            continue;
        }
        let token = match detail.token {
            Some(val) => val,
            None => {
                skipped += 1;
                continue;
            }
        };
        let refresh = match token.refresh_token {
            Some(val) => val,
            None => {
                skipped += 1;
                continue;
            }
        };
        let account = Account {
            email: detail.email,
            refresh_token: Some(refresh),
            project_id: token.project_id.clone(),
            managed_project_id: token.project_id.clone(),
            added_at: Some(now_ms()),
            last_used: Some(now_ms()),
            rate_limit_reset_times: None,
            fingerprint: Some(generate_fingerprint()),
            fingerprint_history: None,
            enabled: Some(true),
        };
        accounts.push(account);
    }

    Ok((accounts, skipped))
}

fn read_settings_file() -> Result<AppSettings, String> {
    let path = settings_path();
    if !path.exists() {
        return Ok(AppSettings {
            theme: "auto".to_string(),
            language: "vi".to_string(),
            tray_enabled: true,
        });
    }
    read_json(&path)
}

fn write_settings_file(settings: &AppSettings) -> Result<(), String> {
    write_json(&settings_path(), settings)
}

#[tauri::command]
fn get_accounts() -> Result<PluginAccountsFile, String> {
    read_accounts_file()
}

#[tauri::command]
fn export_to_file(path: String) -> Result<(), String> {
    let file = read_accounts_file()?;
    write_json(Path::new(&path), &file)
}

#[tauri::command]
fn import_from_file(path: String, mode: String) -> Result<ImportResult, String> {
    let value: serde_json::Value = read_json(Path::new(&path))?;
    let accounts: Vec<Account> = if value.is_array() {
        serde_json::from_value(value).map_err(|e| e.to_string())?
    } else {
        let obj = value.as_object().ok_or("Invalid import format")?;
        if let Some(accounts_val) = obj.get("accounts") {
            serde_json::from_value(accounts_val.clone()).map_err(|e| e.to_string())?
        } else {
            return Err("Invalid import format".to_string());
        }
    };

    let mut incoming = Vec::new();
    let now = now_ms();
    for mut acc in accounts {
        if acc.email.is_empty() {
            continue;
        }
        if acc.fingerprint.is_none() {
            acc.fingerprint = Some(generate_fingerprint());
        }
        if acc.added_at.is_none() {
            acc.added_at = Some(now);
        }
        if acc.last_used.is_none() {
            acc.last_used = Some(now);
        }
        if acc.enabled.is_none() {
            acc.enabled = Some(true);
        }
        incoming.push(acc);
    }

    let imported = incoming.len();
    let existing = read_accounts_file()?;
    let merged = merge_accounts(existing, incoming, &mode);
    let total = merged.accounts.len();
    write_accounts_file(&merged)?;
    Ok(ImportResult {
        imported,
        skipped: 0,
        total,
    })
}

#[tauri::command]
fn import_from_am(mode: String) -> Result<ImportResult, String> {
    let folder = am_folder_path();
    let (accounts, skipped) = import_from_am_folder(&folder)?;
    let imported = accounts.len();
    let existing = read_accounts_file()?;
    let merged = merge_accounts(existing, accounts, &mode);
    let total = merged.accounts.len();
    write_accounts_file(&merged)?;
    Ok(ImportResult {
        imported,
        skipped,
        total,
    })
}

#[tauri::command]
fn set_accounts_enabled(emails: Vec<String>, enabled: bool) -> Result<(), String> {
    let mut file = read_accounts_file()?;
    for acc in &mut file.accounts {
        if emails.iter().any(|e| e.eq_ignore_ascii_case(&acc.email)) {
            acc.enabled = Some(enabled);
        }
    }
    write_accounts_file(&file)
}

#[tauri::command]
fn get_settings() -> Result<AppSettings, String> {
    read_settings_file()
}

#[tauri::command]
fn update_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    write_settings_file(&settings)?;
    let tray = app.tray_handle();
    let _ = tray.set_visible(settings.tray_enabled);
    Ok(settings)
}

fn setup_tray(app: &AppHandle) {
    if let Ok(settings) = read_settings_file() {
        let tray = app.tray_handle();
        let _ = tray.set_visible(settings.tray_enabled);
    }
}

fn main() {
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_item(quit);
    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let window = app.get_window("main").unwrap();
                match id.as_str() {
                    "show" => {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    "hide" => {
                        let _ = window.hide();
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .setup(|app| {
            setup_tray(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_accounts,
            export_to_file,
            import_from_file,
            import_from_am,
            set_accounts_enabled,
            get_settings,
            update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
