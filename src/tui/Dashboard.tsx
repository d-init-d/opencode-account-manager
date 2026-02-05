import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  Header,
  StatsRow,
  AccountList,
  MenuBar,
  MenuAction,
  ProviderList,
  McpServerList,
  SectionBox,
  ExportModal,
  ImportModal,
} from "./components";
import {
  readPluginAccountsFile,
  createEmptyPluginAccountsFile,
  summarizeAccounts,
  mergeAccounts,
  writePluginAccountsFile,
} from "../core/accounts";
import { getPluginAccountsPath, getAmFolderPath } from "../core/paths";
import { Account, PluginAccountsFile } from "../core/types";
import { importFromAmFolder } from "../core/importers/amJson";
import {
  parseOpencodeInfo,
  getConfigSummary,
  OpencodeInfo,
} from "../core/opencode-config";

interface DashboardProps {
  pluginPath?: string;
}

type ActiveSection = "providers" | "accounts" | "mcp";
type ModalType = "none" | "export" | "import" | "export-selected";

function safeReadPluginFile(pluginPath: string): PluginAccountsFile {
  try {
    return readPluginAccountsFile(pluginPath);
  } catch {
    return createEmptyPluginAccountsFile();
  }
}

export function Dashboard({ pluginPath }: DashboardProps) {
  const { exit } = useApp();
  const resolvedPath = getPluginAccountsPath(pluginPath);

  // OpenCode config state
  const [opencodeInfo, setOpencodeInfo] = useState<OpencodeInfo | null>(null);
  
  // Plugin accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, limited: 0 });
  const [message, setMessage] = useState<string | null>(null);
  
  // UI state
  const [activeSection, setActiveSection] = useState<ActiveSection>("providers");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  
  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>("none");

  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  };

  const loadOpencodeConfig = () => {
    const info = parseOpencodeInfo();
    setOpencodeInfo(info);
  };

  const loadAccounts = () => {
    const file = safeReadPluginFile(resolvedPath);
    setAccounts(file.accounts);
    setSummary(summarizeAccounts(file.accounts));
    setCheckedEmails(new Set());
    setSelectedIndex(0);
  };

  const refresh = () => {
    loadOpencodeConfig();
    loadAccounts();
    showMessage("Refreshed", 2000);
  };

  useEffect(() => {
    loadOpencodeConfig();
    loadAccounts();
  }, []);

  // Keyboard navigation (only when no modal is open)
  useInput((input, key) => {
    if (activeModal !== "none") return;

    // Section switching with Tab or Left/Right arrows
    if (key.tab || key.rightArrow) {
      setActiveSection(prev => {
        if (prev === "providers") return "accounts";
        if (prev === "accounts") return "mcp";
        return "providers";
      });
      if (!key.rightArrow || activeSection !== "accounts") {
        setSelectMode(false);
      }
      return;
    }

    if (key.leftArrow) {
      setActiveSection(prev => {
        if (prev === "mcp") return "accounts";
        if (prev === "accounts") return "providers";
        return "mcp";
      });
      if (activeSection !== "accounts") {
        setSelectMode(false);
      }
      return;
    }

    // Number keys for section switching
    if (input === "1") {
      setActiveSection("providers");
      setSelectMode(false);
      return;
    }
    if (input === "2") {
      setActiveSection("accounts");
      return;
    }
    if (input === "3") {
      setActiveSection("mcp");
      setSelectMode(false);
      return;
    }

    // Up/Down arrows for list navigation in accounts section
    if (activeSection === "accounts") {
      if (key.upArrow) {
        if (!selectMode) {
          setSelectMode(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        return;
      }
      if (key.downArrow) {
        if (!selectMode) {
          setSelectMode(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(prev => Math.min(accounts.length - 1, prev + 1));
        }
        return;
      }
      // Space to toggle selection in select mode
      if (selectMode && input === " ") {
        const email = accounts[selectedIndex]?.email;
        if (email) {
          setCheckedEmails(prev => {
            const next = new Set(prev);
            if (next.has(email)) {
              next.delete(email);
            } else {
              next.add(email);
            }
            return next;
          });
        }
      }
    }
  });

  // Export completion handler
  const handleExportComplete = (filePath: string) => {
    setActiveModal("none");
    showMessage(`Exported to ${filePath}`, 4000);
  };

  // Import completion handler
  const handleImportComplete = (importedAccounts: Account[], newCount: number, overwrittenCount: number) => {
    // Merge imported accounts with existing (overwrite mode)
    const file = safeReadPluginFile(resolvedPath);
    const merged = mergeAccounts(file, importedAccounts, "merge");
    writePluginAccountsFile(pluginPath, merged);
    
    setActiveModal("none");
    loadAccounts();
    showMessage(`Imported: ${newCount} new, ${overwrittenCount} updated`, 4000);
  };

  const handleImportAM = () => {
    const amPath = getAmFolderPath();
    const result = importFromAmFolder(amPath);

    if (result.errors.length > 0) {
      showMessage(`Error: ${result.errors[0]}`, 5000);
      return;
    }

    if (result.accounts.length === 0) {
      showMessage(`No accounts found in AM (${result.skipped.length} skipped)`, 4000);
      return;
    }

    const existingFile = safeReadPluginFile(resolvedPath);
    const merged = mergeAccounts(existingFile, result.accounts, "merge");
    writePluginAccountsFile(pluginPath, merged);

    const added = merged.accounts.length - existingFile.accounts.length;
    showMessage(
      `Imported from AM: ${result.accounts.length} found, ${added} new. Total: ${merged.accounts.length}`,
      5000
    );

    loadAccounts();
  };

  const handleEnableSelected = () => {
    if (checkedEmails.size === 0) {
      showMessage("No accounts selected", 2000);
      return;
    }

    const file = safeReadPluginFile(resolvedPath);
    let count = 0;
    
    file.accounts = file.accounts.map(acc => {
      if (checkedEmails.has(acc.email)) {
        count++;
        return { ...acc, enabled: true };
      }
      return acc;
    });

    writePluginAccountsFile(pluginPath, file);
    showMessage(`Enabled ${count} accounts`, 3000);
    loadAccounts();
    setSelectMode(false);
  };

  const handleDisableSelected = () => {
    if (checkedEmails.size === 0) {
      showMessage("No accounts selected", 2000);
      return;
    }

    const file = safeReadPluginFile(resolvedPath);
    let count = 0;
    
    file.accounts = file.accounts.map(acc => {
      if (checkedEmails.has(acc.email)) {
        count++;
        return { ...acc, enabled: false };
      }
      return acc;
    });

    writePluginAccountsFile(pluginPath, file);
    showMessage(`Disabled ${count} accounts`, 3000);
    loadAccounts();
    setSelectMode(false);
  };

  const handleDeleteSelected = () => {
    if (checkedEmails.size === 0) {
      showMessage("No accounts selected", 2000);
      return;
    }

    const file = safeReadPluginFile(resolvedPath);
    const beforeCount = file.accounts.length;
    
    file.accounts = file.accounts.filter(acc => !checkedEmails.has(acc.email));
    const deletedCount = beforeCount - file.accounts.length;

    writePluginAccountsFile(pluginPath, file);
    showMessage(`Deleted ${deletedCount} accounts`, 3000);
    loadAccounts();
    setSelectMode(false);
  };

  const handleSelectAll = () => {
    setCheckedEmails(new Set(accounts.map(a => a.email)));
  };

  const handleSelectNone = () => {
    setCheckedEmails(new Set());
  };

  const handleAction = (action: MenuAction) => {
    // Don't handle actions when modal is open
    if (activeModal !== "none") return;

    switch (action) {
      case "refresh":
        refresh();
        break;
      case "export":
        setActiveModal("export");
        break;
      case "import-file":
        setActiveModal("import");
        break;
      case "import-am":
        handleImportAM();
        break;
      case "toggle-select-mode":
        if (activeSection === "accounts") {
          setSelectMode(prev => !prev);
          setCheckedEmails(new Set());
          setSelectedIndex(0);
        } else {
          showMessage("Switch to Accounts section first (Tab)", 2000);
        }
        break;
      case "select-all":
        handleSelectAll();
        break;
      case "select-none":
        handleSelectNone();
        break;
      case "enable-selected":
        handleEnableSelected();
        break;
      case "disable-selected":
        handleDisableSelected();
        break;
      case "delete-selected":
        handleDeleteSelected();
        break;
      case "export-selected":
        if (checkedEmails.size === 0) {
          showMessage("No accounts selected", 2000);
        } else {
          setActiveModal("export-selected");
        }
        break;
      case "quit":
        exit();
        break;
    }
  };

  // Calculate stats
  const configSummary = opencodeInfo ? getConfigSummary(opencodeInfo) : null;

  // Get accounts to export (all or selected)
  const getAccountsForExport = (): Account[] => {
    if (activeModal === "export-selected") {
      return accounts.filter(acc => checkedEmails.has(acc.email));
    }
    return accounts;
  };

  // If modal is open, render only the modal
  if (activeModal === "export" || activeModal === "export-selected") {
    return (
      <Box flexDirection="column" padding={1}>
        <ExportModal
          accounts={getAccountsForExport()}
          onComplete={handleExportComplete}
          onCancel={() => setActiveModal("none")}
        />
      </Box>
    );
  }

  if (activeModal === "import") {
    return (
      <Box flexDirection="column" padding={1}>
        <ImportModal
          existingAccounts={accounts}
          onComplete={handleImportComplete}
          onCancel={() => setActiveModal("none")}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="OpenCode Account Manager" subtitle="Dashboard" />

      {/* Global Stats */}
      <StatsRow
        stats={[
          { label: "Providers", value: configSummary?.providers || 0, color: "cyan" },
          { label: "Models", value: configSummary?.models || 0, color: "yellow" },
          { label: "MCP On", value: configSummary?.mcpEnabled || 0, color: "green" },
          { label: "MCP Off", value: configSummary?.mcpDisabled || 0, color: "red" },
          { label: "Accounts", value: summary.total, color: "white" },
          { label: "Available", value: summary.available, color: "green" },
          { label: "Limited", value: summary.limited, color: "yellow" },
        ]}
      />

      {/* Tab indicator */}
      <Box marginY={1}>
        <Text dimColor>Sections: </Text>
        <Text color={activeSection === "providers" ? "cyan" : "gray"} bold={activeSection === "providers"}>
          [1] Providers
        </Text>
        <Text> </Text>
        <Text color={activeSection === "accounts" ? "cyan" : "gray"} bold={activeSection === "accounts"}>
          [2] Accounts
        </Text>
        <Text> </Text>
        <Text color={activeSection === "mcp" ? "cyan" : "gray"} bold={activeSection === "mcp"}>
          [3] MCP
        </Text>
        <Text dimColor>  (←→ or Tab to switch, ↑↓ in Accounts)</Text>
      </Box>

      {/* Providers Section */}
      <SectionBox 
        title="PROVIDERS" 
        borderColor={activeSection === "providers" ? "cyan" : "gray"}
        collapsed={activeSection !== "providers"}
      >
        {opencodeInfo && <ProviderList providers={opencodeInfo.providers} />}
      </SectionBox>

      {/* Plugin Accounts Section */}
      <SectionBox 
        title={`PLUGIN ACCOUNTS (${opencodeInfo?.plugins[0]?.name || "antigravity-auth"})`}
        borderColor={activeSection === "accounts" ? (selectMode ? "yellow" : "cyan") : "gray"}
        collapsed={activeSection !== "accounts"}
      >
        <AccountList 
          accounts={accounts} 
          selectedIndex={selectMode ? selectedIndex : -1}
          checkedEmails={checkedEmails}
          showCheckbox={selectMode}
        />
      </SectionBox>

      {/* MCP Servers Section */}
      <SectionBox 
        title="MCP SERVERS" 
        borderColor={activeSection === "mcp" ? "cyan" : "gray"}
        collapsed={activeSection !== "mcp"}
      >
        {opencodeInfo && <McpServerList servers={opencodeInfo.mcpServers} />}
      </SectionBox>

      {/* Config path */}
      <Box marginTop={1}>
        <Text dimColor>Config: {opencodeInfo?.configPath || "N/A"}</Text>
      </Box>

      {/* Menu */}
      <Box marginTop={1}>
        <MenuBar 
          onSelect={handleAction} 
          selectMode={selectMode}
          selectedCount={checkedEmails.size}
        />
      </Box>

      {/* Message */}
      {message && (
        <Box marginTop={1}>
          <Text color="green">→ {message}</Text>
        </Box>
      )}
    </Box>
  );
}
