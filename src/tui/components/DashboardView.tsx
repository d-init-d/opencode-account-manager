import React from "react";
import { Box, Text } from "ink";
import { Account } from "../../core/types";

interface DashboardViewProps {
  accounts: Account[];
  selectedIndex: number;
}

interface RateLimitInfo {
  model: string;
  displayName: string;
  resetTime: number;
  timeRemaining: string;
}

function formatTimeRemaining(resetTime: number): string {
  const now = Date.now();
  if (resetTime <= now) return "";
  
  const remaining = resetTime - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getModelDisplayName(model: string): string {
  // Shorten long model names for display
  if (model.includes(":")) {
    const parts = model.split(":");
    return parts[1] || parts[0];
  }
  return model;
}

function getAccountRateLimits(account: Account): RateLimitInfo[] {
  const now = Date.now();
  const rateLimits = account.rateLimitResetTimes || {};
  
  return Object.entries(rateLimits)
    .filter(([_, time]) => time > now)
    .map(([model, resetTime]) => ({
      model,
      displayName: getModelDisplayName(model),
      resetTime,
      timeRemaining: formatTimeRemaining(resetTime),
    }))
    .sort((a, b) => a.resetTime - b.resetTime);
}

function getAccountStatus(account: Account): { 
  status: string; 
  statusColor: string;
  indicator: string;
} {
  if (account.enabled === false) {
    return { status: "disabled", statusColor: "gray", indicator: "○" };
  }
  
  const limits = getAccountRateLimits(account);
  if (limits.length === 0) {
    return { status: "available", statusColor: "white", indicator: "●" };
  }
  
  return { status: "limited", statusColor: "gray", indicator: "◐" };
}

export function DashboardView({ accounts, selectedIndex }: DashboardViewProps) {
  if (accounts.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No accounts configured.</Text>
        <Text dimColor>Press P to open actions and import accounts.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1} marginBottom={1}>
        <Box width={3}>
          <Text dimColor>{" "}</Text>
        </Box>
        <Box width={30}>
          <Text dimColor bold>EMAIL</Text>
        </Box>
        <Box width={10}>
          <Text dimColor bold>STATUS</Text>
        </Box>
        <Box flexGrow={1}>
          <Text dimColor bold>RATE LIMITS</Text>
        </Box>
      </Box>

      {/* Accounts */}
      {accounts.map((account, index) => {
        const isSelected = index === selectedIndex;
        const { status, statusColor, indicator } = getAccountStatus(account);
        const limits = getAccountRateLimits(account);
        
        // Truncate email
        const email = account.email.length > 28 
          ? account.email.slice(0, 25) + "..." 
          : account.email;

        return (
          <Box key={account.email} paddingX={1}>
            {/* Selection cursor */}
            <Box width={3}>
              <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                {isSelected ? "› " : "  "}
              </Text>
            </Box>
            
            {/* Email */}
            <Box width={30}>
              <Text 
                color={isSelected ? "cyan" : (account.enabled === false ? "gray" : "white")}
                bold={isSelected}
                dimColor={account.enabled === false}
              >
                {email}
              </Text>
            </Box>
            
            {/* Status indicator */}
            <Box width={10}>
              <Text color={statusColor}>
                {indicator} {status}
              </Text>
            </Box>
            
            {/* Rate limits - show all models */}
            <Box flexGrow={1}>
              {limits.length === 0 ? (
                <Text dimColor>—</Text>
              ) : (
                <Text>
                  {limits.map((limit, i) => (
                    <Text key={limit.model}>
                      <Text dimColor>{limit.displayName}</Text>
                      <Text color="gray">:</Text>
                      <Text color="white">{limit.timeRemaining}</Text>
                      {i < limits.length - 1 ? <Text dimColor> │ </Text> : null}
                    </Text>
                  ))}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}

      {/* Summary */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          ─────────────────────────────────────────────────────────────────
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>
          {accounts.length} accounts • {accounts.filter(a => a.enabled !== false && getAccountRateLimits(a).length === 0).length} available • {accounts.filter(a => getAccountRateLimits(a).length > 0).length} limited
        </Text>
      </Box>

      {/* Legend */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>● available  ◐ limited  ○ disabled</Text>
      </Box>
    </Box>
  );
}
