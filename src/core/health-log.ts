import fs from "fs";
import path from "path";
import { AccountHealthResult, AccountHealthStatus } from "./types";
import { getAntigravityLogsPath } from "./paths";
import { normalizeHealthKey } from "./config-store";

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const STATUS_PRIORITY: Record<AccountHealthStatus, number> = {
  verification_required: 9,
  disabled: 8,
  deleted: 7,
  password_changed: 6,
  revoked: 5,
  network_error: 4,
  unknown_error: 3,
  not_configured: 2,
  not_checked: 1,
  ok: 0,
};

function mapLineToStatus(line: string): AccountHealthStatus | undefined {
  const text = line.toLowerCase();

  if (
    text.includes("verification required") ||
    text.includes("complete verification") ||
    text.includes("verify your account") ||
    text.includes("login_required") ||
    text.includes("challenge")
  ) {
    return "verification_required";
  }

  if (text.includes("invalid_grant")) {
    if (text.includes("disabled")) return "disabled";
    if (text.includes("deleted")) return "deleted";
    if (text.includes("password")) return "password_changed";
    if (text.includes("revoked") || text.includes("expired")) return "revoked";
    return "revoked";
  }

  if (text.includes("account has been disabled")) return "disabled";
  if (text.includes("account has been deleted")) return "deleted";
  if (text.includes("password changed")) return "password_changed";
  if (text.includes("revoked")) return "revoked";

  if (
    text.includes("timeout") ||
    text.includes("econnreset") ||
    text.includes("enetunreach") ||
    text.includes("eai_again") ||
    text.includes("rate limit")
  ) {
    return "network_error";
  }

  return undefined;
}

function mergeHealthResults(
  left: AccountHealthResult | undefined,
  right: AccountHealthResult | undefined
): AccountHealthResult | undefined {
  if (!left) return right;
  if (!right) return left;

  const leftPriority = STATUS_PRIORITY[left.status] ?? 0;
  const rightPriority = STATUS_PRIORITY[right.status] ?? 0;
  if (leftPriority !== rightPriority) {
    return leftPriority > rightPriority ? left : right;
  }

  if (left.checkedAt !== right.checkedAt) {
    return left.checkedAt > right.checkedAt ? left : right;
  }

  const sourcePriority = { oauth: 3, log: 2, cache: 1, manual: 0 } as const;
  const leftSource = sourcePriority[left.source] ?? 0;
  const rightSource = sourcePriority[right.source] ?? 0;
  return leftSource >= rightSource ? left : right;
}

function readFileTail(filePath: string, maxBytes: number): string {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  if (size <= maxBytes) {
    return fs.readFileSync(filePath, "utf8");
  }

  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.allocUnsafe(maxBytes);
    const start = Math.max(0, size - maxBytes);
    fs.readSync(fd, buffer, 0, maxBytes, start);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

export interface LogHealthOptions {
  logDir?: string;
  maxFiles?: number;
  maxBytes?: number;
}

export function collectLogHealthResults(
  options: LogHealthOptions = {}
): Record<string, AccountHealthResult> {
  const logDir = options.logDir || getAntigravityLogsPath();
  if (!fs.existsSync(logDir)) return {};

  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const entries = fs.readdirSync(logDir)
    .map((name) => {
      const fullPath = path.join(logDir, name);
      try {
        const stat = fs.statSync(fullPath);
        return { name, fullPath, stat };
      } catch {
        return undefined;
      }
    })
    .filter((entry): entry is { name: string; fullPath: string; stat: fs.Stats } => !!entry)
    .filter((entry) => entry.stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .slice(0, maxFiles);

  const results: Record<string, AccountHealthResult> = {};

  for (const entry of entries) {
    let content = "";
    try {
      content = readFileTail(entry.fullPath, maxBytes);
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const status = mapLineToStatus(line);
      if (!status) continue;

      const emails = line.match(EMAIL_REGEX) || [];
      if (emails.length === 0) continue;

      for (const email of emails) {
        const key = normalizeHealthKey(email);
        const candidate: AccountHealthResult = {
          status,
          source: "log",
          checkedAt: entry.stat.mtimeMs,
          message: line.trim().slice(0, 200),
        };
        results[key] = mergeHealthResults(results[key], candidate) || candidate;
      }
    }
  }

  return results;
}

export function mergeAccountHealth(
  primary: AccountHealthResult | undefined,
  secondary: AccountHealthResult | undefined
): AccountHealthResult | undefined {
  return mergeHealthResults(primary, secondary);
}
