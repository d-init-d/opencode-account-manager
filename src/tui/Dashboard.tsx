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
} from "../core/accounts";
import { getPluginAccountsPath } from "../core/paths";
import { writeJsonFile } from "../core/utils";
import { Account, PluginAccountsFile } from "../core/types";

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

  const loadAccounts = () => {
    const file = safeReadPluginFile(resolvedPath);
    setAccounts(file.accounts);
    setSummary(summarizeAccounts(file.accounts));
    setLastRefresh(new Date().toLocaleTimeString());
    setMessage("Refreshed");
    setTimeout(() => setMessage(null), 2000);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleExport = () => {
    const exportFile = buildPortableExport(accounts);
    const outPath = `antigravity-export-${Date.now()}.json`;
    writeJsonFile(outPath, exportFile);
    setMessage(`Exported to ${outPath}`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAction = (action: MenuAction) => {
    switch (action) {
      case "refresh":
        loadAccounts();
        break;
      case "export":
        handleExport();
        break;
      case "import":
        setMessage("Import: Use CLI command 'antigravity-sync import --file <path>'");
        setTimeout(() => setMessage(null), 4000);
        break;
      case "import-am":
        setMessage("AM Import: Use CLI command 'antigravity-sync am:import'");
        setTimeout(() => setMessage(null), 4000);
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
          <Text color="green">-> {message}</Text>
        </Box>
      )}
    </Box>
  );
}
