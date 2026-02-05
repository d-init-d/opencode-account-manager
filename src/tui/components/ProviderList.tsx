import React from "react";
import { Box, Text } from "ink";
import { ProviderInfo } from "../../core/opencode-config";

interface ProviderListProps {
  providers: ProviderInfo[];
}

export function ProviderList({ providers }: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No providers configured</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box>
        <Box width={20}>
          <Text bold dimColor>PROVIDER</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>MODELS</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>TYPE</Text>
        </Box>
        <Box>
          <Text bold dimColor>BASE URL</Text>
        </Box>
      </Box>

      {/* Rows */}
      {providers.map((provider) => (
        <Box key={provider.id}>
          <Box width={20}>
            <Text color="cyan">{truncate(provider.name || provider.id, 18)}</Text>
          </Box>
          <Box width={10}>
            <Text color="yellow">{provider.modelCount}</Text>
          </Box>
          <Box width={10}>
            <Text color={provider.type === "builtin" ? "green" : "magenta"}>
              {provider.type}
            </Text>
          </Box>
          <Box>
            <Text dimColor>{provider.baseURL || "-"}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}
