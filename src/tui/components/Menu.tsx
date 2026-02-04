import React from "react";
import { Box, Text, useInput } from "ink";

export type MenuAction =
  | "refresh"
  | "export"
  | "import-file"
  | "import-am"
  | "quit";

interface MenuItem {
  label: string;
  value: MenuAction;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "[R] Refresh", value: "refresh" },
  { label: "[E] Export", value: "export" },
  { label: "[I] Import File", value: "import-file" },
  { label: "[A] Import AM", value: "import-am" },
  { label: "[Q] Quit", value: "quit" },
];

interface MenuBarProps {
  onSelect: (action: MenuAction) => void;
}

export function MenuBar({ onSelect }: MenuBarProps) {
  useInput((input, key) => {
    const lower = input.toLowerCase();
    if (lower === "r") onSelect("refresh");
    if (lower === "e") onSelect("export");
    if (lower === "i") onSelect("import-file");
    if (lower === "a") onSelect("import-am");
    if (lower === "q" || key.escape) onSelect("quit");
  });

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      {MENU_ITEMS.map((item) => (
        <Text key={item.value} dimColor>
          {item.label}
        </Text>
      ))}
    </Box>
  );
}
