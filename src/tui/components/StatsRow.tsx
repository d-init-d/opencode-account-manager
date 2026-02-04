import React from "react";
import { Box, Text } from "ink";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = "white" }: StatCardProps) {
  return (
    <Box flexDirection="column" marginRight={2}>
      <Text dimColor>{label}</Text>
      <Text bold color={color}>
        {value}
      </Text>
    </Box>
  );
}

interface StatsRowProps {
  stats: StatCardProps[];
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <Box flexDirection="row" marginY={1}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </Box>
  );
}
