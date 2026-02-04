import React from "react";
import { Box, Text } from "ink";
import { StatusBadge } from "./StatusBadge";
import { Account } from "../../core/types";

interface AccountRowProps {
  account: Account;
  isSelected?: boolean;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "-";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getAccountStatus(account: Account): {
  status: "available" | "limited";
  resetIn: string;
} {
  const resets = account.rateLimitResetTimes || {};
  const now = Date.now();
  const future = Object.values(resets).filter((v) => v > now);
  if (future.length === 0) {
    return { status: "available", resetIn: "-" };
  }
  const nextReset = Math.min(...future);
  return {
    status: "limited",
    resetIn: formatDuration(nextReset - now),
  };
}

export function AccountRow({ account, isSelected }: AccountRowProps) {
  const { status, resetIn } = getAccountStatus(account);
  const project = account.projectId || account.managedProjectId || "-";
  const bgColor = isSelected ? "blue" : undefined;

  return (
    <Box flexDirection="row" paddingX={1} backgroundColor={bgColor}>
      <Box width={30}>
        <Text color={isSelected ? "white" : "cyan"}>{account.email}</Text>
      </Box>
      <Box width={20}>
        <Text dimColor>{project.slice(0, 18)}</Text>
      </Box>
      <Box width={12}>
        <StatusBadge status={status} />
      </Box>
      <Box width={10}>
        <Text dimColor>{resetIn}</Text>
      </Box>
    </Box>
  );
}

interface AccountListProps {
  accounts: Account[];
  selectedIndex?: number;
}

export function AccountList({ accounts, selectedIndex = -1 }: AccountListProps) {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        <Box width={30}>
          <Text bold dimColor>EMAIL</Text>
        </Box>
        <Box width={20}>
          <Text bold dimColor>PROJECT</Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>STATUS</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>RESET IN</Text>
        </Box>
      </Box>
      {accounts.map((account, index) => (
        <AccountRow
          key={account.email}
          account={account}
          isSelected={index === selectedIndex}
        />
      ))}
      {accounts.length === 0 && (
        <Box paddingX={1}>
          <Text dimColor>No accounts found</Text>
        </Box>
      )}
    </Box>
  );
}
