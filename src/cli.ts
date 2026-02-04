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
import { getAmDbPath, getPluginAccountsPath } from "./core/paths";
import { inspectAmDatabase, importFromAmDatabase } from "./core/importers/amSqlite";
import { readJsonFile, writeJsonFile } from "./core/utils";
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
  .name("antigravity-sync")
  .description("Antigravity Sync - TUI dashboard and account manager")
  .version("0.1.0");

program
  .command("list")
  .description("List plugin accounts")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const file = readPluginAccountsFile(pluginPath);
    const summary = summarizeAccounts(file.accounts);

    console.log(`Plugin accounts: ${summary.total}`);
    console.log(`Available: ${summary.available}`);
    console.log(`Limited: ${summary.limited}`);
    console.log("");

    for (const account of file.accounts) {
      const limited = isLimited(account.rateLimitResetTimes);
      const status = limited ? chalk.yellow("limited") : chalk.green("available");
      const lastUsed = formatTimestamp(account.lastUsed);
      const projectId = account.projectId ? ` | ${account.projectId}` : "";
      console.log(`${status}  ${account.email}${projectId}  lastUsed=${lastUsed}`);
    }
  });

program
  .command("export")
  .description("Export plugin accounts to a portable file")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option(
    "--out <path>",
    "Output file path",
    path.resolve(process.cwd(), "antigravity-accounts.export.json")
  )
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const file = readPluginAccountsFile(pluginPath);
    const exportFile = buildPortableExport(file.accounts);
    writeJsonFile(options.out, exportFile);
    console.log(`Exported ${file.accounts.length} accounts to ${options.out}`);
  });

program
  .command("import")
  .description("Import accounts into plugin file")
  .requiredOption("--file <path>", "Import file path")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .option("--mode <merge|replace>", "Merge mode", "merge")
  .option("--format <portable|plugin|auto>", "Import format", "auto")
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const raw = fs.readFileSync(options.file, "utf8");
    const data = JSON.parse(raw) as unknown;
    const format =
      options.format === "portable" || options.format === "plugin"
        ? options.format
        : undefined;
    const incomingAccounts = extractAccountsFromImport(data, format);
    const existingFile = safeReadPluginFile(pluginPath);
    const mode = options.mode === "replace" ? "replace" : "merge";
    const merged = mergeAccounts(existingFile, incomingAccounts, mode);
    writePluginAccountsFile(pluginPath, merged);
    console.log(
      `Imported ${incomingAccounts.length} accounts. Total=${merged.accounts.length}`
    );
  });

program
  .command("am:inspect")
  .description("Inspect Antigravity Manager database")
  .option("--db <path>", "Path to accounts.db", getAmDbPath())
  .action((options) => {
    const info = inspectAmDatabase(options.db);
    for (const table of info.tables) {
      console.log(`${table.name}: ${table.columns.join(", ")}`);
    }
  });

program
  .command("am:import")
  .description("Import accounts from Antigravity Manager database")
  .option("--db <path>", "Path to accounts.db", getAmDbPath())
  .option("--table <name>", "Table name to import")
  .option("--column-map <path|json>", "JSON column map overrides")
  .option("--mode <merge|replace>", "Merge mode", "merge")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .action((options) => {
    const pluginPath = getPluginAccountsPath(options.pluginPath);
    const columnMap = options.columnMap
      ? options.columnMap.trim().startsWith("{")
        ? (JSON.parse(options.columnMap) as Record<string, string>)
        : (readJsonFile<Record<string, string>>(options.columnMap) as Record<
            string,
            string
          >)
      : undefined;
    const incomingAccounts = importFromAmDatabase({
      dbPath: options.db,
      table: options.table,
      columnMap,
    });
    const existingFile = safeReadPluginFile(pluginPath);
    const mode = options.mode === "replace" ? "replace" : "merge";
    const merged = mergeAccounts(existingFile, incomingAccounts, mode);
    writePluginAccountsFile(pluginPath, merged);
    console.log(
      `Imported ${incomingAccounts.length} accounts from AM. Total=${merged.accounts.length}`
    );
  });

program
  .command("dashboard")
  .description("Start the Antigravity Sync TUI dashboard")
  .option("--plugin-path <path>", "Path to plugin accounts file")
  .action((options) => {
    startTuiDashboard({
      pluginPath: options.pluginPath,
    });
  });

program.parse();
