import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface PaletteAction {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  category?: string;
}

interface ActionPaletteProps {
  actions: PaletteAction[];
  onSelect: (actionId: string) => void;
  onClose: () => void;
}

export function ActionPalette({ actions, onSelect, onClose }: ActionPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter actions by search
  const filteredActions = actions.filter(action => {
    const searchLower = search.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchLower) ||
      action.id.toLowerCase().includes(searchLower) ||
      (action.description?.toLowerCase().includes(searchLower))
    );
  });

  useInput((input, key) => {
    // Close on Escape
    if (key.escape) {
      onClose();
      return;
    }

    // Navigate up
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    // Navigate down
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredActions.length - 1, prev + 1));
      return;
    }

    // Select on Enter
    if (key.return) {
      const action = filteredActions[selectedIndex];
      if (action) {
        onSelect(action.id);
      }
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      setSearch(prev => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    // Type to search (printable characters)
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setSearch(prev => prev + input);
      setSelectedIndex(0);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
    >
      {/* Search input */}
      <Box marginBottom={1}>
        <Text bold>{">"} </Text>
        <Text>{search || " "}</Text>
        <Text color="gray">_</Text>
      </Box>

      {/* Actions list */}
      <Box flexDirection="column" marginBottom={1}>
        {filteredActions.length === 0 ? (
          <Text dimColor>No matching actions</Text>
        ) : (
          filteredActions.slice(0, 10).map((action, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={action.id}>
                <Text inverse={isSelected} dimColor={!isSelected}>
                  {isSelected ? "▸ " : "  "}
                  {action.label}
                </Text>
                {action.shortcut && (
                  <Text dimColor> [{action.shortcut}]</Text>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Help */}
      <Box>
        <Text dimColor>↑↓ navigate • Enter select • Esc close</Text>
      </Box>
    </Box>
  );
}
