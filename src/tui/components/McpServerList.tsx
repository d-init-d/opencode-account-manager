import React from "react";
import { Box, Text } from "ink";
import { McpServerInfo } from "../../core/opencode-config";

interface McpServerListProps {
  servers: McpServerInfo[];
}

export function McpServerList({ servers }: McpServerListProps) {
  if (servers.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No MCP servers configured</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box>
        <Box width={20}>
          <Text bold dimColor>SERVER</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>STATUS</Text>
        </Box>
        <Box width={8}>
          <Text bold dimColor>ENV</Text>
        </Box>
        <Box>
          <Text bold dimColor>COMMAND</Text>
        </Box>
      </Box>

      {/* Rows */}
      {servers.map((server) => (
        <Box key={server.id}>
          <Box width={20}>
            <Text color="cyan">{truncate(server.id, 18)}</Text>
          </Box>
          <Box width={10}>
            {server.enabled ? (
              <Text color="green">enabled</Text>
            ) : (
              <Text color="red">disabled</Text>
            )}
          </Box>
          <Box width={8}>
            {server.hasEnvVars ? (
              <Text color="yellow">{server.envVarCount}</Text>
            ) : (
              <Text dimColor>-</Text>
            )}
          </Box>
          <Box>
            <Text dimColor>{truncate(server.command, 40)}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}
