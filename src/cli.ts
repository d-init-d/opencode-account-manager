#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { Command } from "commander";
import chalk from "chalk";
import {
  buildPortableExport,
  createEmptyPluginAccountsFile,
  extractAccountsFromImport,
  mergeAccounts,
  readPluginAccountsFile,
  summarizeAccounts,
  writePluginAccountsFile,
} from "./core/accounts";
import { getPluginAccountsPath, getAmFolderPath } from "./core/paths";
import { importFromAmFolder, isAmFolder } from "./core/importers/amJson";
import { writeJsonFile } from "./core/utils";
import { startTuiDashboard } from "./tui";

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString();
}

function isLimited(rateLimitResetTimes?: Record<string, number>): boolean {
  if (!rateLimitResetTimes) return false;
  const now = Date.now();
  return Object.values(rateLimitResetTimes).some((value) => value > now);
}

function safeReadPluginFile(pluginPath: string) {
  try {
    return readPluginAccountsFile(pluginPath);
  } catch {
    return createEmptyPluginAccountsFile();
  }
}

const program = new Command();

program
  .name("ocam")
  .description("OpenCode Account Manager - TUI dashboard and CLI for managing accounts")
  .version("0.4.0");

// Default command - show dashboard
program
  .command("dashboard", { isDefault: true })
  .description("Start the TUI dashboard (default)")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .action((options) => {
    startTuiDashboard({
      pluginPath: options.pluginPath,
    });
  });

program
  .command("list")
  .description("List plugin accounts")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const file = safeReadPluginFile(pluginPath);
    const summary = summarizeAccounts(file.accounts);

    console.log(chalk.bold("=== Account List ===\n"));
    console.log(`Total: ${summary.total} | Available: ${chalk.green(summary.available)} | Limited: ${chalk.yellow(summary.limited)}\n`);

    for (const account of file.accounts) {
      const limited = isLimited(account.rateLimitResetTimes);
      const status = limited ? chalk.yellow("[LIMITED]") : chalk.green("[  OK  ]");
      console.log(`${status} ${account.email}`);
      
      if (limited && account.rateLimitResetTimes) {
        const now = Date.now();
        for (const [model, resetTime] of Object.entries(account.rateLimitResetTimes)) {
          if (resetTime > now) {
            const hours = ((resetTime - now) / 3600000).toFixed(1);
            console.log(chalk.gray(`          └─ ${model}: ${hours}h`));
          }
        }
      }
    }
  });

program
  .command("export")
  .description("Export accounts to a portable JSON file")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option("-o, --out <path>", "Output file path", `antigravity-export-${Date.now()}.json`)
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const file = safeReadPluginFile(pluginPath);
    
    if (file.accounts.length === 0) {
      console.log(chalk.yellow("No accounts to export."));
      return;
    }

    const exportFile = buildPortableExport(file.accounts);
    writeJsonFile(options.out, exportFile);
    console.log(chalk.green(`Exported ${file.accounts.length} accounts to ${options.out}`));
  });

program
  .command("import")
  .description("Import accounts from file or AM folder")
  .argument("<source>", "Path to JSON file or AM folder (~/.antigravity_tools)")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option("-m, --mode <merge|replace>", "Import mode", "merge")
  .action((source, options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const mode = options.mode === "replace" ? "replace" : "merge";
    const existingFile = safeReadPluginFile(pluginPath);
    const beforeCount = existingFile.accounts.length;

    let incomingAccounts: any[] = [];
    let sourceType = "";

    // Check if source is AM folder
    if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
      if (isAmFolder(source)) {
        sourceType = "AM folder";
        const result = importFromAmFolder(source);
        
        if (result.errors.length > 0) {
          console.log(chalk.red(`Error: ${result.errors.join(", ")}`));
          return;
        }
        
        incomingAccounts = result.accounts;
        
        if (result.skipped.length > 0) {
          console.log(chalk.gray(`Skipped: ${result.skipped.length} accounts`));
        }
      } else {
        console.log(chalk.red("Directory is not a valid AM folder"));
        return;
      }
    } else if (fs.existsSync(source)) {
      // It's a file
      sourceType = "JSON file";
      try {
        const raw = fs.readFileSync(source, "utf8");
        const data = JSON.parse(raw);
        incomingAccounts = extractAccountsFromImport(data);
      } catch (err) {
        console.log(chalk.red(`Failed to parse file: ${err}`));
        return;
      }
    } else {
      console.log(chalk.red(`Source not found: ${source}`));
      return;
    }

    if (incomingAccounts.length === 0) {
      console.log(chalk.yellow("No valid accounts found in source."));
      return;
    }

    const merged = mergeAccounts(existingFile, incomingAccounts, mode);
    writePluginAccountsFile(pluginPath, merged);

    const added = merged.accounts.length - beforeCount;
    console.log(chalk.green(`\nImport complete!`));
    console.log(`Source: ${sourceType}`);
    console.log(`Mode: ${mode}`);
    console.log(`Found: ${incomingAccounts.length} accounts`);
    console.log(`Added: ${added} new`);
    console.log(`Total: ${merged.accounts.length} accounts`);
  });

program
  .command("import-am")
  .description("Import accounts from Antigravity Manager")
  .option("--am-path <path>", "Path to AM folder", getAmFolderPath())
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option("-m, --mode <merge|replace>", "Import mode", "merge")
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const result = importFromAmFolder(options.amPath);

    if (result.errors.length > 0) {
      console.log(chalk.red(`Error: ${result.errors.join(", ")}`));
      return;
    }

    if (result.accounts.length === 0) {
      console.log(chalk.yellow("No accounts found in AM."));
      if (result.skipped.length > 0) {
        console.log(chalk.gray(`Skipped: ${result.skipped.join(", ")}`));
      }
      return;
    }

    const mode = options.mode === "replace" ? "replace" : "merge";
    const existingFile = safeReadPluginFile(pluginPath);
    const merged = mergeAccounts(existingFile, result.accounts, mode);
    writePluginAccountsFile(pluginPath, merged);

    console.log(chalk.green(`\nImported from AM!`));
    console.log(`Found: ${result.accounts.length} accounts`);
    console.log(`Skipped: ${result.skipped.length}`);
    console.log(`Total: ${merged.accounts.length} accounts`);
  });

program.parse();
