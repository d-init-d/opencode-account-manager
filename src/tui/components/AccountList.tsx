import React from "react";
import { Box, Text } from "ink";
import { StatusBadge } from "./StatusBadge";
import { HealthBadge } from "./HealthBadge";
import { Account, AccountHealthResult } from "../../core/types";
import { normalizeHealthKey } from "../../core/config-store";

interface AccountRowProps {
  account: Account;
  isSelected?: boolean;
  isChecked?: boolean;
  showCheckbox?: boolean;
  healthResult?: AccountHealthResult;
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
  status: "available" | "limited" | "disabled";
  resetIn: string;
  limitDetails: string[];
} {
  if (account.enabled === false) {
    return { status: "disabled", resetIn: "-", limitDetails: [] };
  }
  const resets = account.rateLimitResetTimes || {};
  const now = Date.now();
  const limitDetails: string[] = [];
  
  // Build detailed limit info for each model
  for (const [model, resetTime] of Object.entries(resets)) {
    if (resetTime > now) {
      limitDetails.push(`${model}: ${formatDuration(resetTime - now)}`);
    }
  }
  
  if (limitDetails.length === 0) {
    return { status: "available", resetIn: "-", limitDetails: [] };
  }
  
  const nextReset = Math.min(...Object.values(resets).filter((v) => v > now));
  return {
    status: "limited",
    resetIn: formatDuration(nextReset - now),
    limitDetails,
  };
}

export function AccountRow({
  account,
  isSelected,
  isChecked,
  showCheckbox,
  healthResult,
}: AccountRowProps) {
  const { status, resetIn, limitDetails } = getAccountStatus(account);
  const project = account.projectId || account.managedProjectId || "-";

  const checkbox = showCheckbox 
    ? (isChecked ? "[x]" : "[ ]") 
    : "";
  
  const cursor = isSelected ? ">" : " ";
  const emailColor = status === "disabled" ? "gray" : "white";

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" paddingX={1}>
        <Box width={2}>
          <Text color={isSelected ? "white" : "gray"}>{cursor}</Text>
        </Box>
        {showCheckbox && (
          <Box width={4}>
            <Text color={isChecked ? "white" : "gray"}>{checkbox}</Text>
          </Box>
        )}
        <Box width={28}>
          <Text color={emailColor} strikethrough={status === "disabled"}>
            {account.email}
          </Text>
        </Box>
        <Box width={18}>
          <Text dimColor>{project.slice(0, 16)}</Text>
        </Box>
        <Box width={12}>
          <StatusBadge status={status} />
        </Box>
        <Box width={10}>
          <HealthBadge result={healthResult} />
        </Box>
        <Box width={10}>
          <Text dimColor>{resetIn}</Text>
        </Box>
      </Box>
      {status === "limited" && limitDetails.length > 0 && (
        <Box paddingLeft={showCheckbox ? 8 : 4}>
          <Text dimColor>
            └─ {limitDetails.join(" | ")}
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface AccountListProps {
  accounts: Account[];
  selectedIndex?: number;
  checkedEmails?: Set<string>;
  showCheckbox?: boolean;
  healthResults?: Record<string, AccountHealthResult>;
}

export function AccountList({ 
  accounts, 
  selectedIndex = -1, 
  checkedEmails = new Set(),
  showCheckbox = false,
  healthResults
}: AccountListProps) {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        <Box width={2}>
          <Text dimColor> </Text>
        </Box>
        {showCheckbox && (
          <Box width={4}>
            <Text bold dimColor>SEL</Text>
          </Box>
        )}
        <Box width={28}>
          <Text bold dimColor>EMAIL</Text>
        </Box>
        <Box width={18}>
          <Text bold dimColor>PROJECT</Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>STATUS</Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>HEALTH</Text>
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
          isChecked={checkedEmails.has(account.email)}
          showCheckbox={showCheckbox}
          healthResult={healthResults?.[normalizeHealthKey(account.email)]}
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
