import React from "react";
import { Box, Text, useInput } from "ink";

export type MenuAction =
  | "refresh"
  | "export"
  | "export-selected"
  | "import-file"
  | "import-am"
  | "toggle-select-mode"
  | "select-all"
  | "select-none"
  | "enable-selected"
  | "disable-selected"
  | "delete-selected"
  | "quit";

interface MenuItem {
  label: string;
  key: string;
  action: MenuAction;
  selectModeOnly?: boolean;
  normalModeOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Refresh", key: "R", action: "refresh" },
  { label: "Export", key: "E", action: "export", normalModeOnly: true },
  { label: "Import", key: "I", action: "import-file", normalModeOnly: true },
  { label: "AM Import", key: "A", action: "import-am", normalModeOnly: true },
  { label: "Select Mode", key: "S", action: "toggle-select-mode", normalModeOnly: true },
  { label: "Exit Select", key: "S", action: "toggle-select-mode", selectModeOnly: true },
  { label: "All", key: "A", action: "select-all", selectModeOnly: true },
  { label: "None", key: "N", action: "select-none", selectModeOnly: true },
  { label: "Enable", key: "E", action: "enable-selected", selectModeOnly: true },
  { label: "Disable", key: "D", action: "disable-selected", selectModeOnly: true },
  { label: "Export", key: "X", action: "export-selected", selectModeOnly: true },
  { label: "Delete", key: "DEL", action: "delete-selected", selectModeOnly: true },
  { label: "Quit", key: "Q", action: "quit" },
];

interface MenuBarProps {
  onSelect: (action: MenuAction) => void;
  selectMode?: boolean;
  selectedCount?: number;
}

export function MenuBar({ onSelect, selectMode = false, selectedCount = 0 }: MenuBarProps) {
  useInput((input, key) => {
    const lower = input.toLowerCase();
    
    if (selectMode) {
      // Select mode keys
      if (lower === "s" || key.escape) onSelect("toggle-select-mode");
      if (lower === "a") onSelect("select-all");
      if (lower === "n") onSelect("select-none");
      if (lower === "e") onSelect("enable-selected");
      if (lower === "d") onSelect("disable-selected");
      if (lower === "x") onSelect("export-selected");
      if (key.delete || lower === "backspace") onSelect("delete-selected");
      if (lower === "r") onSelect("refresh");
      if (lower === "q") onSelect("quit");
    } else {
      // Normal mode keys
      if (lower === "r") onSelect("refresh");
      if (lower === "e") onSelect("export");
      if (lower === "i") onSelect("import-file");
      if (lower === "a") onSelect("import-am");
      if (lower === "s") onSelect("toggle-select-mode");
      if (lower === "q" || key.escape) onSelect("quit");
    }
  });

  const visibleItems = MENU_ITEMS.filter(item => {
    if (selectMode && item.normalModeOnly) return false;
    if (!selectMode && item.selectModeOnly) return false;
    return true;
  });

  return (
    <Box flexDirection="column">
      {selectMode && (
        <Box marginBottom={1} paddingX={1}>
          <Text dimColor bold>
            SELECT MODE - {selectedCount} selected | ↑↓ navigate | SPACE toggle | ←→ switch section
          </Text>
        </Box>
      )}
      <Box
        borderStyle="single"
        borderColor={selectMode ? "white" : "gray"}
        paddingX={1}
        justifyContent="space-between"
      >
        {visibleItems.map((item) => (
          <Text key={item.action + item.key} dimColor>
            [{item.key}] {item.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
