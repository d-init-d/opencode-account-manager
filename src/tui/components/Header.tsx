import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({
  title = "OpenCode Account Manager",
  subtitle,
}: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="white">
          {title}
        </Text>
        {subtitle ? <Text dimColor> / {subtitle}</Text> : null}
      </Box>
      <Text dimColor>
        ────────────────────────────────────────────────────────────────
      </Text>
    </Box>
  );
}
