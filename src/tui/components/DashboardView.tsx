import React from "react";
import { Box, Text, useStdout } from "ink";
import { Account, AccountHealthResult } from "../../core/types";
import { normalizeHealthKey } from "../../core/config-store";
import { HealthBadge } from "./HealthBadge";

interface DashboardViewProps {
  accounts: Account[];
  selectedIndex: number;
  healthResults?: Record<string, AccountHealthResult>;
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

export function DashboardView({ accounts, selectedIndex, healthResults }: DashboardViewProps) {
  if (accounts.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No accounts configured.</Text>
        <Text dimColor>Press P to open actions and import accounts.</Text>
      </Box>
    );
  }

  const { stdout } = useStdout();
  const terminalColumns = stdout?.columns ?? 120;
  const terminalRows = stdout?.rows ?? 30;

  const allModels = getDisplayModels(accounts);
  const modelColumnWidth = 20;
  const healthWidth = 2;
  const lastUsedWidth = 14;
  const scrollbarWidth = 1;

  const innerWidth = Math.max(60, terminalColumns - 6);
  const baseWidth = 3 + healthWidth + lastUsedWidth + scrollbarWidth;
  const maxEmailWidth = Math.min(28, Math.max(12, innerWidth - baseWidth - modelColumnWidth));
  const emailWidth = maxEmailWidth;
  const remainingWidth = innerWidth - baseWidth - emailWidth;
  const maxModels = Math.max(1, Math.floor(remainingWidth / modelColumnWidth));
  const displayModels = allModels.slice(0, maxModels);
  const totalWidth = baseWidth + emailWidth + displayModels.length * modelColumnWidth;

  const maxRowsFromTerminal = Math.max(8, terminalRows - 18);
  const visibleRows = Math.max(8, Math.min(maxRowsFromTerminal, accounts.length || 8));
  const maxOffset = Math.max(0, accounts.length - visibleRows);
  const scrollOffset = Math.max(0, Math.min(selectedIndex - Math.floor(visibleRows / 2), maxOffset));
  const visibleAccounts = accounts.slice(scrollOffset, scrollOffset + visibleRows);
  const paddedAccounts: Array<Account | undefined> = [
    ...visibleAccounts,
    ...Array.from({ length: Math.max(0, visibleRows - visibleAccounts.length) }, () => undefined),
  ];

  const showScrollbar = accounts.length > visibleRows;
  const thumbSize = showScrollbar
    ? Math.max(1, Math.round((visibleRows * visibleRows) / accounts.length))
    : 0;
  const maxThumbTop = Math.max(0, visibleRows - thumbSize);
  const thumbTop = showScrollbar && maxOffset > 0
    ? Math.round((scrollOffset / maxOffset) * maxThumbTop)
    : 0;

  const healthCounts = healthResults
    ? accounts.reduce(
        (acc, account) => {
          const status = healthResults[normalizeHealthKey(account.email)]?.status || "not_checked";
          if (status === "ok") acc.ok += 1;
          if (status === "verification_required") acc.verify += 1;
          if (status === "not_checked" || status === "not_configured") acc.unchecked += 1;
          if (
            status === "revoked" ||
            status === "disabled" ||
            status === "deleted" ||
            status === "password_changed" ||
            status === "unknown_error" ||
            status === "network_error"
          ) {
            acc.errors += 1;
          }
          return acc;
        },
        { ok: 0, verify: 0, errors: 0, unchecked: 0 }
      )
    : null;

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
        <Box width={healthWidth}>
          <Text dimColor bold>H</Text>
        </Box>
        {displayModels.map(model => (
          <Box key={model.key} width={modelColumnWidth}>
            <Text dimColor bold>{model.shortName}</Text>
          </Box>
        ))}
        <Box width={lastUsedWidth}>
          <Text dimColor bold>LAST USED</Text>
        </Box>
        <Box width={scrollbarWidth}>
          <Text dimColor>|</Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(totalWidth)}</Text>
      </Box>

      {/* Account rows */}
      {paddedAccounts.map((account, index) => {
        const rowIndex = scrollOffset + index;
        const isSelected = account ? rowIndex === selectedIndex : false;
        const isDisabled = account ? account.enabled === false : false;

        const email = account
          ? (account.email.length > emailWidth - 3
            ? account.email.slice(0, emailWidth - 6) + "..."
            : account.email)
          : "";

        const health = account ? healthResults?.[normalizeHealthKey(account.email)] : undefined;
        const scrollbarChar = showScrollbar
          ? (index >= thumbTop && index < thumbTop + thumbSize ? "#" : "|")
          : " ";

        return (
          <Box key={account ? account.email : `empty-${index}`} paddingX={1}>
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
                dimColor={isDisabled || !account}
              >
                {email}
              </Text>
            </Box>

            {/* Health indicator */}
            <Box width={healthWidth}>
              {account ? <HealthBadge result={health} compact={true} /> : <Text dimColor> </Text>}
            </Box>
            
            {/* Model columns */}
            {displayModels.map(model => {
              if (!account) {
                return (
                  <Box key={model.key} width={modelColumnWidth}>
                    <Text dimColor>{" ".repeat(modelColumnWidth - 1)}</Text>
                  </Box>
                );
              }

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
              <Text dimColor>{account ? formatLastUsed(account.lastUsed) : ""}</Text>
            </Box>
            <Box width={scrollbarWidth}>
              <Text dimColor={showScrollbar}>{scrollbarChar}</Text>
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
        {healthCounts && (
          <>
            <Text dimColor> │ </Text>
            <Text color="yellow">{healthCounts.verify}</Text>
            <Text dimColor> need verify</Text>
            <Text dimColor> │ </Text>
            <Text color="red">{healthCounts.errors}</Text>
            <Text dimColor> errors</Text>
            <Text dimColor> │ </Text>
            <Text dimColor>{healthCounts.unchecked} unchecked</Text>
          </>
        )}
      </Box>

      {/* Legend */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>████ 100%</Text>
        <Text dimColor>  ░░░░ limited  </Text>
        <Text dimColor>── disabled  </Text>
        <Text color="green">v</Text><Text dimColor> ok  </Text>
        <Text color="yellow">!</Text><Text dimColor> verify  </Text>
        <Text color="red">x</Text><Text dimColor> error  </Text>
        <Text dimColor>. unchecked</Text>
      </Box>
    </Box>
  );
}
