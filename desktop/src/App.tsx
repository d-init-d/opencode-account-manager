import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Upload,
  HardDriveDownload,
  Settings,
  Sun,
  Moon,
  Monitor,
  CheckSquare,
  Square,
  Search,
} from "lucide-react";
import { open, save } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import {
  Account,
  AppSettings,
  ImportResult,
  Language,
  PluginAccountsFile,
  ThemeMode,
} from "./types";
import { t } from "./i18n";

type StatusFilter = "all" | "available" | "limited" | "disabled";

const defaultSettings: AppSettings = {
  theme: "auto",
  language: "vi",
  trayEnabled: true,
};

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

function getStatus(account: Account): "available" | "limited" | "disabled" {
  if (account.enabled === false) return "disabled";
  const resets = account.rateLimitResetTimes || {};
  const now = Date.now();
  const limited = Object.values(resets).some((value) => value > now);
  return limited ? "limited" : "available";
}

function formatDate(value?: number): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatReset(resets?: Record<string, number>): string {
  if (!resets) return "-";
  const now = Date.now();
  const nextReset = Math.min(...Object.values(resets).filter((v) => v > now));
  if (!Number.isFinite(nextReset)) return "-";
  const minutes = Math.round((nextReset - now) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [accountsFile, setAccountsFile] = useState<PluginAccountsFile>({
    version: 3,
    accounts: [],
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<AppSettings>(defaultSettings);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "enable" | "disable";
  }>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  const lang: Language = settings.language || "vi";

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const refresh = async () => {
    try {
      const file = await invoke<PluginAccountsFile>("get_accounts");
      setAccountsFile(file);
      if (file.accounts.length > 0) {
        setActiveEmail(file.accounts[0].email);
      }
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  const loadSettings = async () => {
    try {
      const value = await invoke<AppSettings>("get_settings");
      setSettings(value);
      applyTheme(value.theme || "auto");
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  useEffect(() => {
    void loadSettings();
    void refresh();
  }, []);

  useEffect(() => {
    if (showSettings) {
      setDraftSettings(settings);
    }
  }, [showSettings, settings]);

  const summary = useMemo(() => {
    const total = accountsFile.accounts.length;
    let available = 0;
    let limited = 0;
    let disabled = 0;
    for (const acc of accountsFile.accounts) {
      const status = getStatus(acc);
      if (status === "available") available++;
      if (status === "limited") limited++;
      if (status === "disabled") disabled++;
    }
    return { total, available, limited, disabled };
  }, [accountsFile.accounts]);

  const filteredAccounts = useMemo(() => {
    return accountsFile.accounts.filter((acc) => {
      const status = getStatus(acc);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search.trim().length === 0) return true;
      const key = `${acc.email} ${acc.projectId || ""} ${acc.managedProjectId || ""}`
        .toLowerCase();
      return key.includes(search.toLowerCase());
    });
  }, [accountsFile.accounts, statusFilter, search]);

  const statusLabels: Record<StatusFilter, string> = {
    all: t(lang, "statusAll"),
    available: t(lang, "statusAvailable"),
    limited: t(lang, "statusLimited"),
    disabled: t(lang, "statusDisabled"),
  };

  const activeAccount = useMemo(() => {
    return accountsFile.accounts.find((acc) => acc.email === activeEmail) || null;
  }, [accountsFile.accounts, activeEmail]);

  const toggleSelected = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEmails(new Set(filteredAccounts.map((acc) => acc.email)));
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
  };

  const handleImportFile = async () => {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath || Array.isArray(filePath)) return;
    try {
      const result = await invoke<ImportResult>("import_from_file", {
        path: filePath,
        mode: importMode,
      });
      showToast(`${t(lang, "toastImported")} (${result.imported})`);
      await refresh();
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  const handleImportAm = async () => {
    try {
      const result = await invoke<ImportResult>("import_from_am", {
        mode: importMode,
      });
      showToast(`${t(lang, "toastImported")} (${result.imported})`);
      await refresh();
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  const handleExport = async () => {
    const filePath = await save({
      filters: [{ name: "JSON", extensions: ["json"] }],
      defaultPath: `antigravity-export-${Date.now()}.json`,
    });
    if (!filePath) return;
    try {
      await invoke("export_to_file", { path: filePath });
      showToast(t(lang, "toastExported"));
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  const handleBulk = async (enabled: boolean) => {
    if (selectedEmails.size === 0) return;
    try {
      await invoke("set_accounts_enabled", {
        emails: Array.from(selectedEmails),
        enabled,
      });
      showToast(t(lang, "toastUpdated"));
      await refresh();
      clearSelection();
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  const handleSettingsSave = async (next: AppSettings) => {
    try {
      const updated = await invoke<AppSettings>("update_settings", { settings: next });
      setSettings(updated);
      applyTheme(updated.theme || "auto");
      showToast(t(lang, "toastUpdated"));
    } catch (error) {
      showToast(`Error: ${String(error)}`);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="header-title">{t(lang, "appTitle")}</div>
          <div className="header-subtitle">{t(lang, "subtitle")}</div>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={handleImportFile}>
            <Upload size={16} /> {t(lang, "importFile")}
          </button>
          <button className="btn" onClick={handleImportAm}>
            <HardDriveDownload size={16} /> {t(lang, "importAm")}
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={16} /> {t(lang, "export")}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> {t(lang, "settings")}
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="panel">
          <div className="stat-grid">
            <div className="stat-card">
              <h4>{t(lang, "total")}</h4>
              <p>{summary.total}</p>
            </div>
            <div className="stat-card">
              <h4>{t(lang, "available")}</h4>
              <p>{summary.available}</p>
            </div>
            <div className="stat-card">
              <h4>{t(lang, "limited")}</h4>
              <p>{summary.limited}</p>
            </div>
            <div className="stat-card">
              <h4>{t(lang, "disabled")}</h4>
              <p>{summary.disabled}</p>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="filter-group">
            <strong>{t(lang, "filters")}</strong>
            <div className="chip-group">
              {([
                "all",
                "available",
                "limited",
                "disabled",
              ] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  className={`chip ${statusFilter === filter ? "active" : ""}`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {statusLabels[filter]}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Search size={16} />
              <input
                className="search-input"
                placeholder={t(lang, "searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div>
              <span className="badge">{t(lang, "mode")}</span>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  className={`chip ${importMode === "merge" ? "active" : ""}`}
                  onClick={() => setImportMode("merge")}
                >
                  {t(lang, "merge")}
                </button>
                <button
                  className={`chip ${importMode === "replace" ? "active" : ""}`}
                  onClick={() => setImportMode("replace")}
                >
                  {t(lang, "replace")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="panel table-panel">
        <div className="table-header">
          <div>
            <span className="badge">{t(lang, "selectedCount")}: {selectedEmails.size}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={selectAll}>
              <CheckSquare size={16} /> {t(lang, "selectAll")}
            </button>
            <button className="btn" onClick={clearSelection}>
              <Square size={16} /> {t(lang, "clearSelection")}
            </button>
            <button className="btn" onClick={() => setConfirmAction({ type: "enable" })}>
              {t(lang, "enableSelected")}
            </button>
            <button className="btn btn-danger" onClick={() => setConfirmAction({ type: "disable" })}>
              {t(lang, "disableSelected")}
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>{t(lang, "email")}</th>
              <th>{t(lang, "status")}</th>
              <th>{t(lang, "resetIn")}</th>
              <th>{t(lang, "projectId")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc) => {
              const status = getStatus(acc);
              return (
                <tr
                  key={acc.email}
                  className={selectedEmails.has(acc.email) ? "row-selected" : ""}
                  onClick={() => setActiveEmail(acc.email)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(acc.email)}
                      onChange={() => toggleSelected(acc.email)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td>{acc.email}</td>
                  <td>
                    <span className={`status-pill status-${status}`}>
                      {status === "available" && t(lang, "statusAvailable")}
                      {status === "limited" && t(lang, "statusLimited")}
                      {status === "disabled" && t(lang, "statusDisabled")}
                    </span>
                  </td>
                  <td>{formatReset(acc.rateLimitResetTimes)}</td>
                  <td>{acc.projectId || acc.managedProjectId || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAccounts.length === 0 && (
          <div>{t(lang, "noAccounts")}</div>
        )}
      </main>

      <aside className="panel detail-panel">
        <h3>{t(lang, "detailTitle")}</h3>
        {!activeAccount && <div>{t(lang, "detailNone")}</div>}
        {activeAccount && (
          <>
            <div className="detail-item">
              <span>Email</span>
              <strong>{activeAccount.email}</strong>
            </div>
            <div className="detail-item">
              <span>{t(lang, "projectId")}</span>
              <strong>{activeAccount.projectId || "-"}</strong>
            </div>
            <div className="detail-item">
              <span>{t(lang, "managedProjectId")}</span>
              <strong>{activeAccount.managedProjectId || "-"}</strong>
            </div>
            <div className="detail-item">
              <span>{t(lang, "lastUsed")}</span>
              <strong>{formatDate(activeAccount.lastUsed)}</strong>
            </div>
            <div className="detail-item">
              <span>{t(lang, "rateLimit")}</span>
              <strong>{formatReset(activeAccount.rateLimitResetTimes)}</strong>
            </div>
          </>
        )}
      </aside>

      {toast && <div className="toast">{toast}</div>}

      {showSettings && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>{t(lang, "settings")}</h3>
            <div className="filter-group">
              <label>{t(lang, "theme")}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`chip ${draftSettings.theme === "light" ? "active" : ""}`}
                  onClick={() => setDraftSettings((prev) => ({ ...prev, theme: "light" }))}
                >
                  <Sun size={14} /> {t(lang, "themeLight")}
                </button>
                <button
                  className={`chip ${draftSettings.theme === "dark" ? "active" : ""}`}
                  onClick={() => setDraftSettings((prev) => ({ ...prev, theme: "dark" }))}
                >
                  <Moon size={14} /> {t(lang, "themeDark")}
                </button>
                <button
                  className={`chip ${draftSettings.theme === "auto" ? "active" : ""}`}
                  onClick={() => setDraftSettings((prev) => ({ ...prev, theme: "auto" }))}
                >
                  <Monitor size={14} /> {t(lang, "themeAuto")}
                </button>
              </div>
              <label>{t(lang, "language")}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`chip ${draftSettings.language === "vi" ? "active" : ""}`}
                  onClick={() => setDraftSettings((prev) => ({ ...prev, language: "vi" }))}
                >
                  VI
                </button>
                <button
                  className={`chip ${draftSettings.language === "en" ? "active" : ""}`}
                  onClick={() => setDraftSettings((prev) => ({ ...prev, language: "en" }))}
                >
                  EN
                </button>
              </div>
              <label>{t(lang, "systemTray")}</label>
              <div>
                <input
                  type="checkbox"
                  checked={draftSettings.trayEnabled}
                  onChange={(event) =>
                    setDraftSettings((prev) => ({
                      ...prev,
                      trayEnabled: event.target.checked,
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowSettings(false)}>
                {t(lang, "cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await handleSettingsSave(draftSettings);
                  setShowSettings(false);
                }}
              >
                {t(lang, "save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>
              {confirmAction.type === "disable"
                ? t(lang, "confirmDisableTitle")
                : t(lang, "confirmEnableTitle")}
            </h3>
            <p>
              {confirmAction.type === "disable"
                ? t(lang, "confirmDisableBody")
                : t(lang, "confirmEnableBody")}
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmAction(null)}>
                {t(lang, "cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await handleBulk(confirmAction.type === "enable");
                  setConfirmAction(null);
                }}
              >
                {t(lang, "confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
