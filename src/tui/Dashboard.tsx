import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  Header,
  StatsRow,
  AccountList,
  MenuBar,
  MenuAction,
} from "./components";
import {
  readPluginAccountsFile,
  createEmptyPluginAccountsFile,
  summarizeAccounts,
  buildPortableExport,
  mergeAccounts,
  writePluginAccountsFile,
} from "../core/accounts";
import { getPluginAccountsPath, getAmFolderPath } from "../core/paths";
import { writeJsonFile } from "../core/utils";
import { Account, PluginAccountsFile } from "../core/types";
import { importFromAmFolder } from "../core/importers/amJson";

interface DashboardProps {
  pluginPath?: string;
}

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

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, limited: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("-");
  
  // Selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  };

  const loadAccounts = () => {
    const file = safeReadPluginFile(resolvedPath);
    setAccounts(file.accounts);
    setSummary(summarizeAccounts(file.accounts));
    setLastRefresh(new Date().toLocaleTimeString());
    setCheckedEmails(new Set());
    setSelectedIndex(0);
    showMessage("Refreshed", 2000);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Keyboard navigation in select mode
  useInput((input, key) => {
    if (!selectMode) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(accounts.length - 1, prev + 1));
    }
    if (input === " ") {
      // Toggle current selection
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
  });

  const handleExport = () => {
    const exportFile = buildPortableExport(accounts);
    const outPath = `antigravity-export-${Date.now()}.json`;
    writeJsonFile(outPath, exportFile);
    showMessage(`Exported ${accounts.length} accounts to ${outPath}`);
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

  const handleExportSelected = () => {
    if (checkedEmails.size === 0) {
      showMessage("No accounts selected", 2000);
      return;
    }

    const selectedAccounts = accounts.filter(acc => checkedEmails.has(acc.email));
    const exportFile = buildPortableExport(selectedAccounts);
    const outPath = `antigravity-export-${Date.now()}.json`;
    writeJsonFile(outPath, exportFile);
    showMessage(`Exported ${selectedAccounts.length} accounts to ${outPath}`);
    setSelectMode(false);
  };

  const handleSelectAll = () => {
    setCheckedEmails(new Set(accounts.map(a => a.email)));
  };

  const handleSelectNone = () => {
    setCheckedEmails(new Set());
  };

  const handleAction = (action: MenuAction) => {
    switch (action) {
      case "refresh":
        loadAccounts();
        break;
      case "export":
        handleExport();
        break;
      case "import-file":
        showMessage("Use CLI: antigravity-sync import <file>", 4000);
        break;
      case "import-am":
        handleImportAM();
        break;
      case "toggle-select-mode":
        setSelectMode(prev => !prev);
        setCheckedEmails(new Set());
        setSelectedIndex(0);
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
        handleExportSelected();
        break;
      case "quit":
        exit();
        break;
    }
  };

  // Count disabled accounts
  const disabledCount = accounts.filter(a => a.enabled === false).length;

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Antigravity Sync" subtitle="Account Dashboard" />

      <StatsRow
        stats={[
          { label: "Total", value: summary.total, color: "white" },
          { label: "Available", value: summary.available, color: "green" },
          { label: "Limited", value: summary.limited, color: "yellow" },
          { label: "Disabled", value: disabledCount, color: "gray" },
        ]}
      />

      <Box marginY={1}>
        <Text dimColor>Plugin: {resolvedPath}</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={selectMode ? "yellow" : "gray"}
        paddingY={1}
      >
        <AccountList 
          accounts={accounts} 
          selectedIndex={selectMode ? selectedIndex : -1}
          checkedEmails={checkedEmails}
          showCheckbox={selectMode}
        />
      </Box>

      <Box marginTop={1}>
        <MenuBar 
          onSelect={handleAction} 
          selectMode={selectMode}
          selectedCount={checkedEmails.size}
        />
      </Box>

      {message && (
        <Box marginTop={1}>
          <Text color="green">→ {message}</Text>
        </Box>
      )}
    </Box>
  );
}
