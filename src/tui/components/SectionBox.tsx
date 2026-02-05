import React from "react";
import { Box, Text } from "ink";

interface SectionBoxProps {
  title: string;
  children: React.ReactNode;
  borderColor?: string;
  collapsed?: boolean;
}

export function SectionBox({ 
  title, 
  children, 
  borderColor = "gray",
  collapsed = false 
}: SectionBoxProps) {
  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor={borderColor}
      marginBottom={1}
    >
      <Box paddingX={1}>
        <Text bold>{title}</Text>
        {collapsed ? <Text dimColor> (collapsed)</Text> : null}
      </Box>
      {!collapsed ? (
        <Box flexDirection="column" paddingY={0}>
          {children}
        </Box>
      ) : null}
    </Box>
  );
}
