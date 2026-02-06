import React from "react";
import { Text } from "ink";
import { AccountHealthResult, AccountHealthStatus } from "../../core/types";

interface HealthBadgeProps {
  result?: AccountHealthResult;
  compact?: boolean;
}

const HEALTH_COLORS: Record<AccountHealthStatus, string> = {
  ok: "green",
  verification_required: "yellow",
  revoked: "red",
  disabled: "gray",
  deleted: "red",
  password_changed: "yellow",
  network_error: "cyan",
  unknown_error: "red",
  not_checked: "gray",
  not_configured: "gray",
};

const HEALTH_ICONS: Record<AccountHealthStatus, string> = {
  ok: "✓",
  verification_required: "⚠",
  revoked: "✘",
  disabled: "○",
  deleted: "✖",
  password_changed: "⌨",
  network_error: "☁",
  unknown_error: "?",
  not_checked: "·",
  not_configured: "-",
};

const HEALTH_LABELS: Record<AccountHealthStatus, string> = {
  ok: "OK",
  verification_required: "VERIFY",
  revoked: "REVOKED",
  disabled: "DISABLED",
  deleted: "DELETED",
  password_changed: "PWD CHG",
  network_error: "NET ERR",
  unknown_error: "ERROR",
  not_checked: "UNCHECK",
  not_configured: "NO CFG",
};

export function HealthBadge({ result, compact = false }: HealthBadgeProps) {
  if (!result) {
    return <Text dimColor>-</Text>;
  }

  const color = HEALTH_COLORS[result.status] || "gray";
  const icon = HEALTH_ICONS[result.status] || "?";
  const label = HEALTH_LABELS[result.status] || result.status.toUpperCase();

  return (
    <Text color={color}>
      {icon}
      {compact ? "" : ` ${label}`}
    </Text>
  );
}
