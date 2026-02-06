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
import { checkAccountsHealth, HealthCheckResult } from "./core/health-orchestrator";
import { AccountHealthStatus } from "./core/types";

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString();
}

function getStatusLabel(status: AccountHealthStatus): string {
  switch (status) {
    case "verification_required":
      return chalk.bgYellow.black(" VERIFY ");
    case "revoked":
      return chalk.bgRed.white(" REVOKED ");
    case "disabled":
      return chalk.bgRed.white(" DISABLED ");
    case "deleted":
      return chalk.bgRed.white(" DELETED ");
    case "password_changed":
      return chalk.bgYellow.black(" PASSWD ");
    case "network_error":
      return chalk.bgBlue.white(" NETWORK ");
    case "unknown_error":
      return chalk.bgRed.white(" ERROR ");
    case "not_configured":
      return chalk.bgGray.white(" CONFIG ");
    default:
      return chalk.bgGray.white(` ${status.toUpperCase()} `);
  }
}

function printHealthCheckResult(result: HealthCheckResult) {
  const { counts, timing, items } = result;
  const issues =
    counts.total -
    counts.byStatus.ok -
    (counts.byStatus.not_checked || 0);

  console.log(chalk.bold("\n=== Health Check Summary ==="));
  console.log(
    `Total: ${counts.total} | ` +
      `${chalk.green("OK: " + counts.byStatus.ok)} | ` +
      `${
        issues > 0 ? chalk.red("Issues: " + issues) : chalk.gray("Issues: 0")
      } | ` +
      `Time: ${(timing.durationMs / 1000).toFixed(1)}s\n`
  );

  const warnings = items.filter(
    (item) => item.result.status !== "ok" && item.result.status !== "not_checked"
  );

  if (warnings.length > 0) {
    console.log(chalk.bold("Warnings:"));
    for (const item of warnings) {
      const label = getStatusLabel(item.result.status);
      const msg = item.result.message || item.result.status;
      console.log(`${label} ${item.email} ${chalk.gray(`(${msg})`)}`);
    }
    console.log("");
  } else if (counts.total > 0) {
    console.log(chalk.green("All accounts are healthy.\n"));
  }
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

function parseEmailList(input?: string): string[] | undefined {
  if (!input) return undefined;
  const items = input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return items.length > 0 ? items : undefined;
}

const program = new Command();

program
  .name("ocam")
  .description("OpenCode Account Manager - TUI dashboard and CLI for managing accounts")
  .version("0.5.3");

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
  .command("check")
  .description("Check account health status")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option("--emails <emails>", "Comma-separated list of emails to check")
  .option("--force", "Bypass cache and cooldown checks", false)
  .action(async (options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const file = safeReadPluginFile(pluginPath);
    const emails = parseEmailList(options.emails);

    if (file.accounts.length === 0) {
      console.log(chalk.yellow("No accounts to check."));
      return;
    }

    const result = await checkAccountsHealth(file.accounts, {
      emails,
      force: options.force === true,
      includeLogs: true,
      onProgress: (current, total, message) => {
        if (total > 0) {
          process.stdout.write(`\r${chalk.gray(`[${current}/${total}]`)} ${message}   `);
        }
      },
    });

    process.stdout.write("\n");

    printHealthCheckResult(result);
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
