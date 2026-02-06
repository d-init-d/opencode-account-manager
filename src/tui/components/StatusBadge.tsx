import React from "react";
import { Text } from "ink";
import { AccountHealthStatus } from "../../core/types";

interface StatusBadgeProps {
  status: "available" | "limited" | "disabled" | "error" | AccountHealthStatus;
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  // UI Statuses
  available: "white",
  limited: "gray",
  disabled: "gray",
  error: "red",
  
  // Health Statuses
  ok: "green",
  verification_required: "yellow",
  revoked: "red",
  deleted: "gray",
  password_changed: "yellow",
  network_error: "cyan",
  unknown_error: "red",
  not_checked: "gray",
  not_configured: "gray",
};

const STATUS_ICONS: Record<string, string> = {
  // UI Statuses
  available: "●",
  limited: "◐",
  disabled: "○",
  error: "!",
  
  // Health Statuses
  ok: "●",
  verification_required: "⚠",
  revoked: "✘",
  deleted: "✖",
  password_changed: "⌨",
  network_error: "☁",
  unknown_error: "?",
  not_checked: "·",
  not_configured: "-",
};

const STATUS_LABELS: Record<string, string> = {
  verification_required: "VERIFY",
  password_changed: "PWD CHG",
  network_error: "NET ERR",
  unknown_error: "ERROR",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || "gray";
  const icon = STATUS_ICONS[status] || "?";
  const text = label || STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase();

  return (
    <Text color={color}>
      {icon} {text}
    </Text>
  );
}

