import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  Header,
  StatsRow,
  AccountList,
  ProviderList,
  McpServerList,
  SectionBox,
  ExportModal,
  ImportModal,
  ActionPalette,
  PaletteAction,
  DashboardView,
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

type ModalType = "none" | "export" | "import" | "export-selected" | "palette";
type MainTab = "dashboard" | "settings";

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
  
  // Main tab state
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  
  // Dashboard tab state
  const [dashboardIndex, setDashboardIndex] = useState(0);
  
  // Settings tab state
  const [expandedSection, setExpandedSection] = useState<"providers" | "accounts" | "mcp">("accounts");
  const [settingsNavIndex, setSettingsNavIndex] = useState(0);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  
  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

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
  };

  const refresh = async () => {
    setIsLoading(true);
    
    setLoadingStep("Loading OpenCode config...");
    await new Promise(r => setTimeout(r, 100)); // Small delay for UI update
    loadOpencodeConfig();
    
    setLoadingStep("Loading accounts...");
    await new Promise(r => setTimeout(r, 100));
    loadAccounts();
    
    setLoadingStep("Done!");
    await new Promise(r => setTimeout(r, 300));
    
    setIsLoading(false);
    setLoadingStep("");
    showMessage("Refreshed", 2000);
  };

  useEffect(() => {
    loadOpencodeConfig();
    loadAccounts();
  }, []);

  // Build settings navigation items
  const buildSettingsNavItems = () => {
    const items: Array<{ type: "section" | "account"; id?: string; index?: number; email?: string }> = [
      { type: "section", id: "providers" },
      { type: "section", id: "accounts" },
    ];

    if (expandedSection === "accounts") {
      accounts.forEach((acc, index) => {
        items.push({ type: "account", index, email: acc.email });
      });
    }

    items.push({ type: "section", id: "mcp" });
    return items;
  };

  const settingsNavItems = buildSettingsNavItems();

  // Palette actions
  const paletteActions: PaletteAction[] = [
    { id: "refresh", label: "Refresh", shortcut: "R" },
    { id: "export", label: "Export All Accounts", shortcut: "E" },
    { id: "import", label: "Import from File", shortcut: "I" },
    { id: "import-am", label: "Import from Antigravity Manager", shortcut: "A" },
    ...(checkedEmails.size > 0 ? [
      { id: "export-selected", label: `Export Selected (${checkedEmails.size})`, shortcut: "X" },
      { id: "enable-selected", label: `Enable Selected (${checkedEmails.size})` },
      { id: "disable-selected", label: `Disable Selected (${checkedEmails.size})` },
      { id: "delete-selected", label: `Delete Selected (${checkedEmails.size})`, shortcut: "Del" },
      { id: "clear-selection", label: "Clear Selection", shortcut: "N" },
    ] : []),
    { id: "select-all", label: "Select All Accounts", shortcut: "Ctrl+A" },
    { id: "quit", label: "Quit", shortcut: "Q" },
  ];

  // Keyboard navigation
  useInput((input, key) => {
    if (activeModal === "palette") return;
    if (activeModal !== "none") return;

    // Tab to switch between main tabs
    if (key.tab) {
      setActiveTab(prev => prev === "dashboard" ? "settings" : "dashboard");
      return;
    }

    // Open palette with P
    if (input === "p" || input === "P") {
      setActiveModal("palette");
      return;
    }

    // Quick shortcuts
    if (input === "q" || input === "Q") {
      exit();
      return;
    }
    if (input === "r" || input === "R") {
      refresh();
      return;
    }

    // Tab-specific navigation
    if (activeTab === "dashboard") {
      // Dashboard tab navigation
      if (key.upArrow) {
        setDashboardIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setDashboardIndex(prev => Math.min(accounts.length - 1, prev + 1));
        return;
      }
      // Space/Enter to toggle selection
      if (input === " " || key.return) {
        const email = accounts[dashboardIndex]?.email;
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
        return;
      }
    } else {
      // Settings tab navigation
      if (key.upArrow) {
        setSettingsNavIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSettingsNavIndex(prev => Math.min(settingsNavItems.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        const currentItem = settingsNavItems[settingsNavIndex];
        if (currentItem?.type === "section" && currentItem.id) {
          setExpandedSection(currentItem.id as "providers" | "accounts" | "mcp");
        } else if (currentItem?.type === "account" && currentItem.email) {
          const email = currentItem.email;
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
        return;
      }
      if (input === " ") {
        const currentItem = settingsNavItems[settingsNavIndex];
        if (currentItem?.type === "account" && currentItem.email) {
          const email = currentItem.email;
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
        return;
      }
    }

    // Escape to clear selection
    if (key.escape) {
      if (checkedEmails.size > 0) {
        setCheckedEmails(new Set());
        showMessage("Selection cleared", 1500);
      }
      return;
    }
  });

  // Handle palette action
  const handlePaletteAction = (actionId: string) => {
    setActiveModal("none");

    switch (actionId) {
      case "refresh":
        refresh();
        break;
      case "export":
        setActiveModal("export");
        break;
      case "import":
        setActiveModal("import");
        break;
      case "import-am":
        handleImportAM();
        break;
      case "export-selected":
        if (checkedEmails.size > 0) {
          setActiveModal("export-selected");
        } else {
          showMessage("No accounts selected", 2000);
        }
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
      case "select-all":
        setCheckedEmails(new Set(accounts.map(a => a.email)));
        showMessage(`Selected ${accounts.length} accounts`, 2000);
        break;
      case "clear-selection":
        setCheckedEmails(new Set());
        showMessage("Selection cleared", 1500);
        break;
      case "quit":
        exit();
        break;
    }
  };

  // Export completion handler
  const handleExportComplete = (filePath: string) => {
    setActiveModal("none");
    showMessage(`Exported to ${filePath}`, 4000);
  };

  // Import completion handler
  const handleImportComplete = (importedAccounts: Account[], newCount: number, overwrittenCount: number) => {
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
      `Imported from AM: ${result.accounts.length} found, ${added} new`,
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
    setCheckedEmails(new Set());
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
    setCheckedEmails(new Set());
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
    setCheckedEmails(new Set());
  };

  // Calculate stats
  const configSummary = opencodeInfo ? getConfigSummary(opencodeInfo) : null;

  // Get accounts to export
  const getAccountsForExport = (): Account[] => {
    if (activeModal === "export-selected") {
      return accounts.filter(acc => checkedEmails.has(acc.email));
    }
    return accounts;
  };

  // Settings nav helpers
  const currentSettingsItem = settingsNavItems[settingsNavIndex];
  const isOnSection = (id: string) => currentSettingsItem?.type === "section" && currentSettingsItem.id === id;

  // Render modals
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
      <Header title="OpenCode Account Manager" subtitle={activeTab === "dashboard" ? "Dashboard" : "Settings"} />

      {/* Tab bar */}
      <Box marginBottom={1}>
        <Text 
          backgroundColor={activeTab === "dashboard" ? "cyan" : undefined}
          color={activeTab === "dashboard" ? "black" : "gray"}
          bold={activeTab === "dashboard"}
        >
          {" DASHBOARD "}
        </Text>
        <Text> </Text>
        <Text 
          backgroundColor={activeTab === "settings" ? "cyan" : undefined}
          color={activeTab === "settings" ? "black" : "gray"}
          bold={activeTab === "settings"}
        >
          {" SETTINGS "}
        </Text>
        <Text dimColor>  (Tab to switch)</Text>
      </Box>

      {/* Global Stats */}
      <StatsRow
        stats={[
          { label: "Accounts", value: summary.total, color: "white" },
          { label: "Available", value: summary.available, color: "green" },
          { label: "Limited", value: summary.limited, color: "yellow" },
          { label: "Providers", value: configSummary?.providers || 0, color: "cyan" },
          { label: "MCP", value: configSummary?.mcpEnabled || 0, color: "magenta" },
        ]}
      />

      {/* Help bar */}
      <Box marginY={1}>
        <Text dimColor>↑↓ navigate • Space select • </Text>
        <Text color="cyan" bold>R</Text>
        <Text dimColor> refresh • </Text>
        <Text color="cyan" bold>P</Text>
        <Text dimColor> actions • </Text>
        <Text color="cyan" bold>Tab</Text>
        <Text dimColor> switch • Q quit</Text>
        {checkedEmails.size > 0 && (
          <Text color="yellow"> • {checkedEmails.size} selected</Text>
        )}
      </Box>

      {/* Loading indicator */}
      {isLoading && loadingStep && (
        <Box marginBottom={1} paddingX={1}>
          <Text color="cyan">⟳ {loadingStep}</Text>
        </Box>
      )}

      {/* Tab content */}
      {activeTab === "dashboard" ? (
        // Dashboard Tab - Rate limits view like Antigravity Manager
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
          <DashboardView 
            accounts={accounts} 
            selectedIndex={dashboardIndex}
          />
        </Box>
      ) : (
        // Settings Tab - Original sections view
        <>
          <SectionBox 
            title="PROVIDERS" 
            borderColor={isOnSection("providers") ? "cyan" : (expandedSection === "providers" ? "white" : "gray")}
            collapsed={expandedSection !== "providers"}
          >
            {opencodeInfo && <ProviderList providers={opencodeInfo.providers} />}
          </SectionBox>

          <SectionBox 
            title={`ACCOUNTS (${opencodeInfo?.plugins[0]?.name || "antigravity-auth"})`}
            borderColor={isOnSection("accounts") || (currentSettingsItem?.type === "account") ? "cyan" : (expandedSection === "accounts" ? "white" : "gray")}
            collapsed={expandedSection !== "accounts"}
          >
            <AccountList 
              accounts={accounts} 
              selectedIndex={currentSettingsItem?.type === "account" ? (currentSettingsItem.index ?? -1) : -1}
              checkedEmails={checkedEmails}
              showCheckbox={true}
            />
          </SectionBox>

          <SectionBox 
            title="MCP SERVERS" 
            borderColor={isOnSection("mcp") ? "cyan" : (expandedSection === "mcp" ? "white" : "gray")}
            collapsed={expandedSection !== "mcp"}
          >
            {opencodeInfo && <McpServerList servers={opencodeInfo.mcpServers} />}
          </SectionBox>
        </>
      )}

      {/* Config path */}
      <Box marginTop={1}>
        <Text dimColor>Config: {opencodeInfo?.configPath || "N/A"}</Text>
      </Box>

      {/* Message */}
      {message && (
        <Box marginTop={1}>
          <Text color="green">→ {message}</Text>
        </Box>
      )}

      {/* Action Palette overlay */}
      {activeModal === "palette" && (
        <Box position="absolute" marginTop={3} marginLeft={10}>
          <ActionPalette
            actions={paletteActions}
            onSelect={handlePaletteAction}
            onClose={() => setActiveModal("none")}
          />
        </Box>
      )}
    </Box>
  );
}
