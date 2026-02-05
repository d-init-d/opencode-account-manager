import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface PasswordInputProps {
  mode: "single" | "confirm";
  title?: string;
  subtitle?: string;
  warning?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function PasswordInput({
  mode,
  title = "Enter Password",
  subtitle,
  warning,
  onSubmit,
  onCancel,
}: PasswordInputProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeField, setActiveField] = useState<"password" | "confirm">("password");
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    // Handle escape
    if (key.escape) {
      onCancel();
      return;
    }

    // Handle tab to switch fields (in confirm mode)
    if (key.tab && mode === "confirm") {
      setActiveField(prev => prev === "password" ? "confirm" : "password");
      return;
    }

    // Handle enter
    if (key.return) {
      if (mode === "confirm" && activeField === "password") {
        // Move to confirm field
        setActiveField("confirm");
        return;
      }

      // Validate
      if (password.length === 0) {
        setError("Password cannot be empty");
        return;
      }

      if (mode === "confirm" && password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      onSubmit(password);
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (activeField === "password") {
        setPassword(prev => prev.slice(0, -1));
      } else {
        setConfirmPassword(prev => prev.slice(0, -1));
      }
      setError(null);
      return;
    }

    // Handle regular input (printable characters)
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      if (activeField === "password") {
        setPassword(prev => prev + input);
      } else {
        setConfirmPassword(prev => prev + input);
      }
      setError(null);
    }
  });

  const maskPassword = (pwd: string): string => {
    return "•".repeat(pwd.length);
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{title}</Text>
        {subtitle && <Text dimColor> - {subtitle}</Text>}
      </Box>

      {/* Password field */}
      <Box>
        <Text dimColor>Password: </Text>
        <Box
          borderStyle={activeField === "password" ? "single" : undefined}
          borderColor="yellow"
          paddingX={1}
          minWidth={30}
        >
          <Text color={activeField === "password" ? "white" : "gray"}>
            {maskPassword(password)}
            {activeField === "password" && <Text color="yellow">▌</Text>}
          </Text>
        </Box>
      </Box>

      {/* Confirm field (only in confirm mode) */}
      {mode === "confirm" && (
        <Box marginTop={1}>
          <Text dimColor>Confirm:  </Text>
          <Box
            borderStyle={activeField === "confirm" ? "single" : undefined}
            borderColor="yellow"
            paddingX={1}
            minWidth={30}
          >
            <Text color={activeField === "confirm" ? "white" : "gray"}>
              {maskPassword(confirmPassword)}
              {activeField === "confirm" && <Text color="yellow">▌</Text>}
            </Text>
          </Box>
        </Box>
      )}

      {/* Warning */}
      {warning && (
        <Box marginTop={1}>
          <Text color="yellow">⚠️  {warning}</Text>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          {mode === "confirm" && "[Tab] Switch field  "}
          [Enter] Confirm  [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
}
