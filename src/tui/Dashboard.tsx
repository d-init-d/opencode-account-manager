import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
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

  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  };

  const loadAccounts = () => {
    const file = safeReadPluginFile(resolvedPath);
    setAccounts(file.accounts);
    setSummary(summarizeAccounts(file.accounts));
    setLastRefresh(new Date().toLocaleTimeString());
    showMessage("Refreshed", 2000);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

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

    // Merge with existing
    const existingFile = safeReadPluginFile(resolvedPath);
    const merged = mergeAccounts(existingFile, result.accounts, "merge");
    writePluginAccountsFile(pluginPath, merged);

    const added = merged.accounts.length - existingFile.accounts.length;
    showMessage(
      `Imported from AM: ${result.accounts.length} found, ${added} new. Total: ${merged.accounts.length}`,
      5000
    );

    // Reload
    loadAccounts();
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
        showMessage("Use CLI: antigravity-sync import --file <path>", 4000);
        break;
      case "import-am":
        handleImportAM();
        break;
      case "quit":
        exit();
        break;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Antigravity Sync" subtitle="Account Dashboard" />

      <StatsRow
        stats={[
          { label: "Total", value: summary.total, color: "white" },
          { label: "Available", value: summary.available, color: "green" },
          { label: "Limited", value: summary.limited, color: "yellow" },
          { label: "Last Refresh", value: lastRefresh, color: "gray" },
        ]}
      />

      <Box marginY={1}>
        <Text dimColor>Plugin: {resolvedPath}</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingY={1}
      >
        <AccountList accounts={accounts} />
      </Box>

      <Box marginTop={1}>
        <MenuBar onSelect={handleAction} />
      </Box>

      {message && (
        <Box marginTop={1}>
          <Text color="green">→ {message}</Text>
        </Box>
      )}
    </Box>
  );
}
