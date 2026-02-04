import React from "react";
import { Text } from "ink";

interface StatusBadgeProps {
  status: "available" | "limited" | "error";
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  available: "green",
  limited: "yellow",
  error: "red",
};

const STATUS_ICONS: Record<string, string> = {
  available: "o",
  limited: "-",
  error: "x",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || "gray";
  const icon = STATUS_ICONS[status] || "?";
  const text = label || status.toUpperCase();

  return (
    <Text color={color}>
      {icon} {text}
    </Text>
  );
}
