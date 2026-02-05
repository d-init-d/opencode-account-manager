import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import { FileBrowser } from "./FileBrowser";
import { PasswordInput } from "./PasswordInput";
import {
  Account,
  EncryptedExportFile,
  PortableExportFile,
  isEncryptedExportFile,
  isPortableExportFile,
  isAMExportFile,
  ImportFileType,
} from "../../core/types";
import { decrypt } from "../../core/crypto";
import { readJsonFile } from "../../core/utils";
import { updateLastImportFolder, getLastImportFolder } from "../../core/config-store";
import { importFromAMExportContent, AMExportEntry } from "../../core/importers/amExport";

interface ImportModalProps {
  existingAccounts: Account[];
  onComplete: (accounts: Account[], newCount: number, overwrittenCount: number) => void;
  onCancel: () => void;
}

type ImportStep = "file" | "password" | "preview" | "importing" | "success" | "error";

interface ImportPreviewItem {
  email: string;
  exists: boolean;
}

type DetectedFormat = "encrypted" | "portable" | "am-export" | "raw-array" | "unknown";

export function ImportModal({ existingAccounts, onComplete, onCancel }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("file");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat>("unknown");
  const [importedAccounts, setImportedAccounts] = useState<Account[]>([]);
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState({ newCount: 0, overwrittenCount: 0 });

  // Check if account exists in current accounts
  const existsInCurrent = (email: string): boolean => {
    return existingAccounts.some(
      acc => acc.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Handle file selection
  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    updateLastImportFolder(path.dirname(filePath));

    try {
      const data = readJsonFile(filePath);

      if (isEncryptedExportFile(data)) {
        // Encrypted .ocam file
        setIsEncrypted(true);
        setDetectedFormat("encrypted");
        setStep("password");
      } else if (isAMExportFile(data)) {
        // Antigravity Manager export format: [{ email, refresh_token }]
        setIsEncrypted(false);
        setDetectedFormat("am-export");
        processAMExport(data);
      } else if (isPortableExportFile(data)) {
        // opencode-account-manager plain export
        setIsEncrypted(false);
        setDetectedFormat("portable");
        processAccounts(data.accounts);
      } else if (Array.isArray(data) && data.length > 0 && data[0].email) {
        // Raw array of accounts (legacy format)
        setIsEncrypted(false);
        setDetectedFormat("raw-array");
        processAccounts(data);
      } else {
        throw new Error("Unknown file format. Expected: encrypted, AM export, or portable format.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setStep("error");
    }
  };

  // Process Antigravity Manager export format
  const processAMExport = (entries: AMExportEntry[]) => {
    const result = importFromAMExportContent(entries);

    if (result.errors.length > 0) {
      setError(result.errors.join("; "));
      setStep("error");
      return;
    }

    if (result.accounts.length === 0) {
      setError(`No valid accounts found. Skipped: ${result.skipped.join(", ") || "none"}`);
      setStep("error");
      return;
    }

    setImportedAccounts(result.accounts);

    // Build preview
    const preview: ImportPreviewItem[] = result.accounts.map(acc => ({
      email: acc.email,
      exists: existsInCurrent(acc.email),
    }));

    setPreviewItems(preview);
    setStep("preview");
  };

  // Handle password for encrypted files
  const handlePasswordSubmit = (password: string) => {
    try {
      const data = readJsonFile<EncryptedExportFile>(selectedFile);
      
      const decrypted = decrypt<{ accounts: Account[] }>(
        {
          salt: data.salt,
          iv: data.iv,
          authTag: data.authTag,
          data: data.data,
        },
        password
      );

      processAccounts(decrypted.accounts);
    } catch (err) {
      setError("Invalid password or corrupted file");
      setStep("error");
    }
  };

  // Process accounts and show preview
  const processAccounts = (accounts: Account[]) => {
    // Filter valid accounts
    const validAccounts = accounts.filter(
      acc => acc.email && acc.email.includes("@")
    );

    if (validAccounts.length === 0) {
      setError("No valid accounts found in file");
      setStep("error");
      return;
    }

    setImportedAccounts(validAccounts);

    // Build preview
    const preview: ImportPreviewItem[] = validAccounts.map(acc => ({
      email: acc.email,
      exists: existsInCurrent(acc.email),
    }));

    setPreviewItems(preview);
    setStep("preview");
  };

  // Handle import confirmation
  useInput((input, key) => {
    if (step === "preview") {
      if (key.return) {
        doImport();
      } else if (key.escape) {
        onCancel();
      }
    } else if (step === "success" || step === "error") {
      if (key.return || key.escape) {
        if (step === "success") {
          onComplete(importedAccounts, result.newCount, result.overwrittenCount);
        } else {
          onCancel();
        }
      }
    }
  });

  // Do the actual import
  const doImport = () => {
    setStep("importing");

    const newCount = previewItems.filter(p => !p.exists).length;
    const overwrittenCount = previewItems.filter(p => p.exists).length;

    setResult({ newCount, overwrittenCount });
    setStep("success");

    // Auto-complete after 2 seconds
    setTimeout(() => {
      onComplete(importedAccounts, newCount, overwrittenCount);
    }, 2000);
  };

  return (
    <Box flexDirection="column">
      {/* File Selection */}
      {step === "file" && (
        <FileBrowser
          mode="file"
          initialPath={getLastImportFolder()}
          extensions={[".ocam", ".json"]}
          title="Select file to import"
          onSelect={handleFileSelect}
          onCancel={onCancel}
        />
      )}

      {/* Password Input */}
      {step === "password" && (
        <PasswordInput
          mode="single"
          title="Enter Password"
          subtitle={path.basename(selectedFile)}
          onSubmit={handlePasswordSubmit}
          onCancel={onCancel}
        />
      )}

      {/* Preview */}
      {step === "preview" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
        >
          <Text bold>IMPORT PREVIEW</Text>
          <Box marginY={1}>
            <Text>
              Found {importedAccounts.length} accounts in{" "}
              <Text color="cyan">{path.basename(selectedFile)}</Text>
              {detectedFormat === "encrypted" && <Text color="green"> (encrypted)</Text>}
              {detectedFormat === "am-export" && <Text color="magenta"> (AM export)</Text>}
              {detectedFormat === "portable" && <Text color="blue"> (portable)</Text>}
            </Text>
          </Box>

          {/* Account list */}
          <Box flexDirection="column">
            {previewItems.slice(0, 8).map((item, index) => (
              <Box key={item.email}>
                <Text>• {item.email}</Text>
                {item.exists && (
                  <Text color="yellow"> ⚠️ exists (will overwrite)</Text>
                )}
              </Box>
            ))}
            {previewItems.length > 8 && (
              <Text dimColor>... and {previewItems.length - 8} more</Text>
            )}
          </Box>

          {/* Summary */}
          <Box marginTop={1}>
            <Text>
              <Text color="green">{previewItems.filter(p => !p.exists).length} new</Text>
              {" | "}
              <Text color="yellow">{previewItems.filter(p => p.exists).length} will overwrite</Text>
            </Text>
          </Box>

          <Box marginTop={1}>
            <Text dimColor>[Enter] Import  [Esc] Cancel</Text>
          </Box>
        </Box>
      )}

      {/* Importing */}
      {step === "importing" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
        >
          <Text>Importing...</Text>
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
          <Text bold color="green">✓ Import Successful!</Text>
          <Box marginTop={1}>
            <Text>
              Imported {importedAccounts.length} accounts
              {" ("}
              <Text color="green">{result.newCount} new</Text>
              {", "}
              <Text color="yellow">{result.overwrittenCount} overwritten</Text>
              {")"}
            </Text>
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
          <Text bold color="red">✗ Import Failed</Text>
          <Box marginTop={1}>
            <Text color="red">{error || "Unknown error"}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Enter] Try again  [Esc] Cancel</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
