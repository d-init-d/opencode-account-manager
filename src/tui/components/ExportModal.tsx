import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import * as path from "path";
import { FileBrowser } from "./FileBrowser";
import { PasswordInput } from "./PasswordInput";
import {
  Account,
  ExportFormat,
  EncryptedExportFile,
  PortableExportFile,
} from "../../core/types";
import { encrypt } from "../../core/crypto";
import { writeJsonFile } from "../../core/utils";
import {
  updateLastExportFolder,
  getLastExportFolder,
} from "../../core/config-store";

interface ExportModalProps {
  accounts: Account[];
  onComplete: (filePath: string) => void;
  onCancel: () => void;
}

type ExportStep = "format" | "folder" | "password" | "exporting" | "success" | "error";

export function ExportModal({ accounts, onComplete, onCancel }: ExportModalProps) {
  const [step, setStep] = useState<ExportStep>("format");
  const [format, setFormat] = useState<ExportFormat>("encrypted");
  const [folder, setFolder] = useState<string>("");
  const [exportedPath, setExportedPath] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Generate filename with timestamp
  const generateFilename = (ext: string): string => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    return `opencode-accounts-${dateStr}${ext}`;
  };

  // Handle format selection
  useInput((input, key) => {
    if (step !== "format") return;

    if (key.escape) {
      onCancel();
      return;
    }

    if (input === "1") {
      setFormat("encrypted");
      setStep("folder");
    } else if (input === "2") {
      setFormat("plain");
      setStep("folder");
    }
  });

  // Handle folder selection
  const handleFolderSelect = (selectedFolder: string) => {
    setFolder(selectedFolder);
    updateLastExportFolder(selectedFolder);

    if (format === "encrypted") {
      setStep("password");
    } else {
      // Plain export - no password needed
      doExport(selectedFolder, undefined);
    }
  };

  // Handle password submission
  const handlePasswordSubmit = (password: string) => {
    doExport(folder, password);
  };

  // Do the actual export
  const doExport = (targetFolder: string, password?: string) => {
    setStep("exporting");

    try {
      const ext = format === "encrypted" ? ".ocam" : ".json";
      const filename = generateFilename(ext);
      const filePath = path.join(targetFolder, filename);

      if (format === "encrypted" && password) {
        // Create encrypted export
        const payload = {
          version: 1,
          accounts: accounts,
          exportedAt: Date.now(),
        };

        const encrypted = encrypt(payload, password);

        const encryptedFile: EncryptedExportFile = {
          version: 1,
          format: "encrypted",
          algorithm: "aes-256-gcm",
          salt: encrypted.salt,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          data: encrypted.data,
          exportedAt: Date.now(),
          accountCount: accounts.length,
          exportedFrom: "opencode-account-manager",
        };

        writeJsonFile(filePath, encryptedFile);
      } else {
        // Plain export
        const plainFile: PortableExportFile = {
          version: 1,
          exportedAt: Date.now(),
          exportedFrom: "opencode-account-manager",
          accounts: accounts,
        };

        writeJsonFile(filePath, plainFile);
      }

      setExportedPath(filePath);
      setStep("success");

      // Auto-complete after 2 seconds
      setTimeout(() => {
        onComplete(filePath);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  };

  // Handle success/error dismissal
  useInput((input, key) => {
    if (step === "success" || step === "error") {
      if (key.return || key.escape) {
        if (step === "success") {
          onComplete(exportedPath);
        } else {
          onCancel();
        }
      }
    }
  });

  return (
    <Box flexDirection="column">
      {/* Format Selection */}
      {step === "format" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
        >
          <Text bold>EXPORT {accounts.length} ACCOUNTS</Text>
          <Box marginY={1} flexDirection="column">
            <Text>Select export format:</Text>
            <Box marginTop={1}>
              <Text color="green">[1] Encrypted (.ocam)</Text>
              <Text dimColor> - Password protected, recommended</Text>
            </Box>
            <Box>
              <Text color="yellow">[2] Plain JSON</Text>
              <Text dimColor> - No encryption (tokens visible!)</Text>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[1-2] Select  [Esc] Cancel</Text>
          </Box>
        </Box>
      )}

      {/* Folder Selection */}
      {step === "folder" && (
        <FileBrowser
          mode="folder"
          initialPath={getLastExportFolder()}
          title={`Export to folder (${format === "encrypted" ? ".ocam" : ".json"})`}
          onSelect={handleFolderSelect}
          onCancel={onCancel}
        />
      )}

      {/* Password Input */}
      {step === "password" && (
        <PasswordInput
          mode="confirm"
          title="Set Export Password"
          subtitle={`${accounts.length} accounts`}
          warning="Remember this password! Without it, you cannot recover your accounts."
          onSubmit={handlePasswordSubmit}
          onCancel={() => setStep("folder")}
        />
      )}

      {/* Exporting */}
      {step === "exporting" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
        >
          <Text>Exporting...</Text>
        </Box>
      )}

      {/* Success */}
      {step === "success" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="green"
          paddingX={2}
          paddingY={1}
        >
          <Text bold color="green">✓ Export Successful!</Text>
          <Box marginTop={1}>
            <Text>Exported {accounts.length} accounts to:</Text>
          </Box>
          <Box>
            <Text color="cyan">{exportedPath || "Unknown path"}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Enter] Close</Text>
          </Box>
        </Box>
      )}

      {/* Error */}
      {step === "error" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="red"
          paddingX={2}
          paddingY={1}
        >
          <Text bold color="red">✗ Export Failed</Text>
          <Box marginTop={1}>
            <Text color="red">{error || "Unknown error"}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Enter] Close</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
