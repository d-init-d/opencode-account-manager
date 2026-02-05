import React from "react";
import { Box, Text } from "ink";
import { Account } from "../../core/types";

interface DashboardViewProps {
  accounts: Account[];
  selectedIndex: number;
}

// Model definitions with display names
const MODEL_CONFIGS = [
  { key: "claude", displayName: "Claude", shortName: "Claude" },
  { key: "gemini", displayName: "Gemini Pro", shortName: "G Pro" },
  { key: "gemini-cli:gemini-3-flash-preview", displayName: "Gemini Flash", shortName: "G Flash" },
  { key: "gemini-cli:gemini-3-pro-preview", displayName: "Gemini Pro", shortName: "G Pro" },
  { key: "gemini-cli:gemini-2.5-pro", displayName: "G 2.5 Pro", shortName: "G2.5P" },
  { key: "gemini-cli:imagen-3", displayName: "Imagen 3", shortName: "Img3" },
];

interface ModelStatus {
  available: boolean;
  timeRemaining: string;
  percentage: number;
  resetTime: number;
}

function formatTimeRemaining(resetTime: number): string {
  const now = Date.now();
  if (resetTime <= now) return "0h 0m";
  
  const remaining = resetTime - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function calculatePercentage(resetTime: number): number {
  const now = Date.now();
  if (resetTime <= now) return 100;
  
  const remaining = resetTime - now;
  const maxTime = 5 * 3600000; // 5 hours as max reference
  const elapsed = maxTime - remaining;
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / maxTime) * 100)));
  return pct;
}

function getModelStatus(account: Account, modelKey: string): ModelStatus {
  const now = Date.now();
  const rateLimits = account.rateLimitResetTimes || {};
  
  // Check if model is rate limited
  const resetTime = rateLimits[modelKey] || 0;
  
  if (resetTime <= now) {
    return {
      available: true,
      timeRemaining: "0h 0m",
      percentage: 100,
      resetTime: 0,
    };
  }
  
  return {
    available: false,
    timeRemaining: formatTimeRemaining(resetTime),
    percentage: calculatePercentage(resetTime),
    resetTime,
  };
}

function getActiveModels(accounts: Account[]): typeof MODEL_CONFIGS {
  const now = Date.now();
  const activeKeys = new Set<string>();
  
  // Collect all model keys that have rate limit data
  accounts.forEach(acc => {
    if (acc.rateLimitResetTimes) {
      Object.keys(acc.rateLimitResetTimes).forEach(key => {
        activeKeys.add(key);
      });
    }
  });
  
  // Return models that are in our config OR have rate limit data
  const models = MODEL_CONFIGS.filter(m => activeKeys.has(m.key));
  
  // If no models found, show default ones
  if (models.length === 0) {
    return MODEL_CONFIGS.slice(0, 2); // Claude and Gemini
  }
  
  return models;
}

// Progress bar component using text
function ProgressBar({ percentage, width = 8 }: { percentage: number; width?: number }) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  // Color based on percentage
  const color = percentage === 100 ? "white" : percentage >= 50 ? "gray" : "gray";
  
  return (
    <Text color={color}>
      {"█".repeat(filled)}
      <Text dimColor>{"░".repeat(empty)}</Text>
    </Text>
  );
}

// Model cell component
function ModelCell({ status, width = 18 }: { status: ModelStatus; width?: number }) {
  return (
    <Box width={width}>
      <Box width={8}>
        <ProgressBar percentage={status.percentage} width={6} />
      </Box>
      <Box width={6}>
        <Text dimColor>{status.timeRemaining.padStart(5)}</Text>
      </Box>
      <Box width={4}>
        <Text color={status.percentage === 100 ? "white" : "gray"}>
          {String(status.percentage).padStart(3)}%
        </Text>
      </Box>
    </Box>
  );
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

  const activeModels = getActiveModels(accounts);
  const modelColumnWidth = 18;
  const emailWidth = 28;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1}>
        <Box width={3}>
          <Text dimColor>{" "}</Text>
        </Box>
        <Box width={emailWidth}>
          <Text dimColor bold>EMAIL</Text>
        </Box>
        {activeModels.map(model => (
          <Box key={model.key} width={modelColumnWidth}>
            <Text dimColor bold>{model.shortName}</Text>
          </Box>
        ))}
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(3 + emailWidth + activeModels.length * modelColumnWidth)}</Text>
      </Box>

      {/* Account rows */}
      {accounts.map((account, index) => {
        const isSelected = index === selectedIndex;
        const isDisabled = account.enabled === false;
        
        // Truncate email
        const email = account.email.length > emailWidth - 3 
          ? account.email.slice(0, emailWidth - 6) + "..." 
          : account.email;

        return (
          <Box key={account.email} paddingX={1}>
            {/* Selection cursor */}
            <Box width={3}>
              <Text bold={isSelected}>
                {isSelected ? "› " : "  "}
              </Text>
            </Box>
            
            {/* Email */}
            <Box width={emailWidth}>
              <Text 
                bold={isSelected}
                dimColor={isDisabled}
              >
                {email}
              </Text>
            </Box>
            
            {/* Model columns */}
            {activeModels.map(model => {
              const status = getModelStatus(account, model.key);
              
              if (isDisabled) {
                return (
                  <Box key={model.key} width={modelColumnWidth}>
                    <Text dimColor>── disabled ──</Text>
                  </Box>
                );
              }
              
              return (
                <ModelCell 
                  key={model.key} 
                  status={status} 
                  width={modelColumnWidth}
                />
              );
            })}
          </Box>
        );
      })}

      {/* Summary */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>{"─".repeat(3 + emailWidth + activeModels.length * modelColumnWidth)}</Text>
      </Box>
      
      <Box paddingX={1}>
        <Text dimColor>
          {accounts.length} accounts
        </Text>
        <Text dimColor> │ </Text>
        <Text>
          {accounts.filter(a => {
            if (a.enabled === false) return false;
            const now = Date.now();
            const limits = a.rateLimitResetTimes || {};
            return !Object.values(limits).some(t => t > now);
          }).length}
        </Text>
        <Text dimColor> available</Text>
        <Text dimColor> │ </Text>
        <Text dimColor>
          {accounts.filter(a => {
            if (a.enabled === false) return false;
            const now = Date.now();
            const limits = a.rateLimitResetTimes || {};
            return Object.values(limits).some(t => t > now);
          }).length} limited
        </Text>
        <Text dimColor> │ </Text>
        <Text dimColor>
          {accounts.filter(a => a.enabled === false).length} disabled
        </Text>
      </Box>

      {/* Legend */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>████ 100%</Text>
        <Text dimColor>  ░░░░ limited  </Text>
        <Text dimColor>── disabled</Text>
      </Box>
    </Box>
  );
}
