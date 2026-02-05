import React from "react";
import { Box, Text } from "ink";
import { Account } from "../../core/types";

interface DashboardViewProps {
  accounts: Account[];
  selectedIndex: number;
}

// Model families for rate limit display
const MODEL_FAMILIES = ["claude", "gemini", "gpt", "deepseek", "o1", "o3"];

function formatTimeRemaining(resetTime: number): string {
  const now = Date.now();
  if (resetTime <= now) return "";
  
  const remaining = resetTime - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getAccountStatus(account: Account): { status: string; color: string } {
  if (!account.enabled) {
    return { status: "DISABLED", color: "gray" };
  }
  
  const now = Date.now();
  const rateLimits = account.rateLimitResetTimes || {};
  const limitedModels = Object.entries(rateLimits)
    .filter(([_, time]) => time > now);
  
  if (limitedModels.length === 0) {
    return { status: "AVAILABLE", color: "green" };
  }
  
  return { status: "LIMITED", color: "yellow" };
}

function getRateLimitBar(account: Account, model: string): { bar: string; color: string; time: string } {
  const now = Date.now();
  const resetTime = account.rateLimitResetTimes?.[model] || 0;
  
  if (resetTime <= now) {
    return { bar: "████████", color: "green", time: "" };
  }
  
  // Calculate remaining time as percentage (assume 24h max)
  const remaining = resetTime - now;
  const maxTime = 24 * 3600000; // 24 hours
  const percentage = Math.min(1, remaining / maxTime);
  const filledBlocks = Math.round((1 - percentage) * 8);
  const emptyBlocks = 8 - filledBlocks;
  
  return {
    bar: "█".repeat(filledBlocks) + "░".repeat(emptyBlocks),
    color: percentage > 0.5 ? "red" : "yellow",
    time: formatTimeRemaining(resetTime),
  };
}

export function DashboardView({ accounts, selectedIndex }: DashboardViewProps) {
  if (accounts.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No accounts found. Press P to open actions and import accounts.</Text>
      </Box>
    );
  }

  // Get all unique models from accounts
  const allModels = new Set<string>();
  accounts.forEach(acc => {
    if (acc.rateLimitResetTimes) {
      Object.keys(acc.rateLimitResetTimes).forEach(m => allModels.add(m));
    }
  });
  
  // Use predefined families or detected models
  const displayModels = MODEL_FAMILIES.filter(m => 
    accounts.some(acc => acc.rateLimitResetTimes?.[m])
  );
  
  if (displayModels.length === 0) {
    displayModels.push("claude", "gemini"); // Default columns
  }

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        <Box width={30}>
          <Text bold color="cyan">ACCOUNT</Text>
        </Box>
        <Box width={12}>
          <Text bold color="cyan">STATUS</Text>
        </Box>
        {displayModels.map(model => (
          <Box key={model} width={14}>
            <Text bold color="cyan">{model.toUpperCase()}</Text>
          </Box>
        ))}
      </Box>
      
      {/* Separator */}
      <Box>
        <Text dimColor>{"─".repeat(30 + 12 + displayModels.length * 14)}</Text>
      </Box>

      {/* Account rows */}
      {accounts.map((account, index) => {
        const isSelected = index === selectedIndex;
        const { status, color } = getAccountStatus(account);
        
        // Truncate email
        const emailDisplay = account.email.length > 28 
          ? account.email.slice(0, 25) + "..." 
          : account.email;

        return (
          <Box key={account.email}>
            {/* Selection indicator */}
            <Text color={isSelected ? "cyan" : undefined}>
              {isSelected ? "▸ " : "  "}
            </Text>
            
            {/* Email */}
            <Box width={28}>
              <Text 
                color={isSelected ? "cyan" : (account.enabled === false ? "gray" : "white")}
                bold={isSelected}
              >
                {emailDisplay}
              </Text>
            </Box>
            
            {/* Status */}
            <Box width={12}>
              <Text color={color}>{status}</Text>
            </Box>
            
            {/* Rate limit bars for each model */}
            {displayModels.map(model => {
              const { bar, color: barColor, time } = getRateLimitBar(account, model);
              return (
                <Box key={model} width={14}>
                  <Text color={barColor}>{bar}</Text>
                  {time ? <Text dimColor> {time}</Text> : null}
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Legend */}
      <Box marginTop={1}>
        <Text color="green">████</Text>
        <Text dimColor> Available  </Text>
        <Text color="yellow">░░░░</Text>
        <Text dimColor> Limited  </Text>
        <Text color="gray">████</Text>
        <Text dimColor> Disabled</Text>
      </Box>
    </Box>
  );
}
