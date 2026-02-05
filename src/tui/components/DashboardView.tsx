import React from "react";
import { Box, Text } from "ink";
import { Account } from "../../core/types";

interface DashboardViewProps {
  accounts: Account[];
  selectedIndex: number;
}

interface ModelConfig {
  key: string;
  displayName: string;
  shortName: string;
}

// Model definitions with display names
const MODEL_CONFIGS: ModelConfig[] = [
  { key: "claude", displayName: "Claude", shortName: "Claude" },
  { key: "gemini-cli:gemini-3-pro-preview", displayName: "G3 Pro", shortName: "G3 Pro" },
  { key: "gemini-cli:gemini-3-flash-preview", displayName: "G3 Flash", shortName: "G3 Fl" },
  { key: "gemini-cli:imagen-3", displayName: "G3 Image", shortName: "G3 Img" },
  { key: "gemini-cli:gemini-2.5-pro", displayName: "G2.5 Pro", shortName: "G2.5" },
  { key: "gemini-cli:gemini-2.0-flash", displayName: "G2 Flash", shortName: "G2 Fl" },
  { key: "gemini", displayName: "Gemini", shortName: "Gem" },
];

const DEFAULT_MODEL_KEYS = [
  "claude",
  "gemini-cli:gemini-3-pro-preview",
  "gemini-cli:gemini-3-flash-preview",
  "gemini-cli:imagen-3",
];

const MODEL_CONFIG_MAP = new Map(MODEL_CONFIGS.map((model) => [model.key, model]));

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
  const maxTime = 24 * 3600000;
  const clamped = Math.min(remaining, maxTime);
  const elapsed = maxTime - clamped;
  return Math.max(0, Math.min(100, Math.round((elapsed / maxTime) * 100)));
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

function getModelDisplayName(model: string): string {
  if (model.includes(":")) {
    const parts = model.split(":");
    return parts[1] || parts[0];
  }
  return model;
}

function getModelShortName(model: string): string {
  const name = getModelDisplayName(model);
  if (name.length <= 7) return name;
  return name.slice(0, 6) + "…";
}

function getDisplayModels(accounts: Account[]): ModelConfig[] {
  const activeKeys = new Set<string>(DEFAULT_MODEL_KEYS);

  accounts.forEach((acc) => {
    if (acc.rateLimitResetTimes) {
      Object.keys(acc.rateLimitResetTimes).forEach((key) => {
        activeKeys.add(key);
      });
    }
  });

  const models: ModelConfig[] = [];

  DEFAULT_MODEL_KEYS.forEach((key) => {
    const config = MODEL_CONFIG_MAP.get(key);
    if (config) models.push(config);
  });

  const extraKeys = Array.from(activeKeys).filter((key) => !DEFAULT_MODEL_KEYS.includes(key));
  extraKeys.sort().forEach((key) => {
    const config = MODEL_CONFIG_MAP.get(key);
    if (config) {
      models.push(config);
    } else {
      models.push({
        key,
        displayName: getModelDisplayName(key),
        shortName: getModelShortName(key),
      });
    }
  });

  return models;
}

function formatLastUsed(timestamp?: number): string {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

// Progress bar component using text
function ProgressBar({ percentage, width = 6 }: { percentage: number; width?: number }) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      {"█".repeat(filled)}
      <Text dimColor>{"░".repeat(empty)}</Text>
    </Text>
  );
}

// Model cell component
function ModelCell({ status, width = 20 }: { status: ModelStatus; width?: number }) {
  return (
    <Box width={width}>
      <Box width={8}>
        <ProgressBar percentage={status.percentage} width={6} />
      </Box>
      <Box width={7}>
        <Text dimColor>{status.timeRemaining.padStart(6)}</Text>
      </Box>
      <Box width={5}>
        <Text>{`${status.percentage}%`.padStart(4)}</Text>
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

  const displayModels = getDisplayModels(accounts);
  const modelColumnWidth = 20;
  const emailWidth = 28;
  const lastUsedWidth = 14;
  const totalWidth = 3 + emailWidth + displayModels.length * modelColumnWidth + lastUsedWidth;

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
        {displayModels.map(model => (
          <Box key={model.key} width={modelColumnWidth}>
            <Text dimColor bold>{model.shortName}</Text>
          </Box>
        ))}
        <Box width={lastUsedWidth}>
          <Text dimColor bold>LAST USED</Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(totalWidth)}</Text>
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
            {displayModels.map(model => {
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
            <Box width={lastUsedWidth}>
              <Text dimColor>{formatLastUsed(account.lastUsed)}</Text>
            </Box>
          </Box>
        );
      })}

      {/* Summary */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>{"─".repeat(totalWidth)}</Text>
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
