import { Account, AccountHealthResult, AccountHealthStatus } from "./types";
import {
  getHealthCache,
  getHealthSettings,
  normalizeHealthKey,
  setHealthCacheEntry,
} from "./config-store";
import { checkAccountHealthOAuth } from "./health-oauth";
import { collectLogHealthResults, mergeAccountHealth, redactMessage } from "./health-log";

export type HealthSkipReason = "no_refresh_token" | "cooldown" | "disabled";

export interface HealthCheckOptions {
  emails?: string[];
  force?: boolean;
  includeLogs?: boolean;
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface HealthCheckItem {
  email: string;
  result: AccountHealthResult;
  skipped?: boolean;
  skipReason?: HealthSkipReason;
  cached?: boolean;
}

export interface HealthCheckResult {
  items: HealthCheckItem[];
  counts: {
    total: number;
    checked: number;
    skipped: number;
    cached: number;
    byStatus: Record<AccountHealthStatus, number>;
  };
  timing: {
    startedAt: number;
    completedAt: number;
    durationMs: number;
  };
}

function createBaseResult(message: string): AccountHealthResult {
  return {
    status: "not_checked",
    source: "manual",
    checkedAt: Date.now(),
    message,
  };
}

function mergeStatusCounts(
  counts: Record<AccountHealthStatus, number>,
  status: AccountHealthStatus
) {
  counts[status] = (counts[status] || 0) + 1;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();
  const tasks: Promise<void>[] = [];

  const safeLimit = Math.max(1, limit || 1);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const promise = (async () => {
      results[index] = await task(item);
    })();
    tasks.push(promise);
    executing.add(promise);

    const clean = () => executing.delete(promise);
    promise.finally(clean).catch(clean);

    if (executing.size >= safeLimit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(tasks);
  return results;
}

export async function checkAccountsHealth(
  accounts: Account[],
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  const includeLogs = options.includeLogs ?? true;
  const force = options.force ?? false;
  const settings = getHealthSettings();
  const cache = getHealthCache();
  const logResults = includeLogs ? collectLogHealthResults() : {};

  const emailFilter = options.emails?.map((email) => normalizeHealthKey(email));
  const filteredAccounts = emailFilter
    ? accounts.filter((acc) => emailFilter.includes(normalizeHealthKey(acc.email)))
    : accounts;

  const items: HealthCheckItem[] = [];
  const toCheck: Array<{ email: string; refreshToken: string }> = [];
  const now = Date.now();

  for (const account of filteredAccounts) {
    const email = account.email;
    const key = normalizeHealthKey(email);
    const cached = !force ? cache[key] : undefined;

    if (cached && now - cached.checkedAt <= settings.ttlMs) {
      const merged = mergeAccountHealth(cached, logResults[key]) || cached;
      items.push({ email, result: merged, cached: true });
      continue;
    }

    if (!force && cached && now - cached.checkedAt < settings.cooldownMs) {
      const base = createBaseResult("Cooldown active");
      const merged = mergeAccountHealth(base, logResults[key]) || base;
      items.push({
        email,
        result: merged,
        skipped: true,
        skipReason: "cooldown",
      });
      continue;
    }

    if (account.enabled === false) {
      const base = createBaseResult("Account disabled");
      const merged = mergeAccountHealth(base, logResults[key]) || base;
      items.push({
        email,
        result: merged,
        skipped: true,
        skipReason: "disabled",
      });
      continue;
    }

    if (!account.refreshToken) {
      const base = createBaseResult("Missing refresh token");
      const merged = mergeAccountHealth(base, logResults[key]) || base;
      items.push({
        email,
        result: merged,
        skipped: true,
        skipReason: "no_refresh_token",
      });
      continue;
    }

    toCheck.push({ email, refreshToken: account.refreshToken });
  }

  let completed = 0;
  const total = toCheck.length;

  const checkedResults = await runWithConcurrency(
    toCheck,
    settings.maxConcurrency,
    async (item) => {
      if (options.onProgress) {
        options.onProgress(completed, total, `Checking ${item.email}...`);
      }

      let oauthResult: AccountHealthResult;

      try {
        oauthResult = await checkAccountHealthOAuth(item.refreshToken);
      } catch (error) {
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes("network") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ETIMEDOUT") ||
            error.message.includes("ENOTFOUND") ||
            error.message.includes("socket") ||
            error.message.includes("timeout"));

        oauthResult = {
          status: isNetworkError ? "network_error" : "unknown_error",
          source: "oauth",
          checkedAt: Date.now(),
          message: error instanceof Error ? error.message : String(error),
        };
      }

      const key = normalizeHealthKey(item.email);
      const merged = mergeAccountHealth(oauthResult, logResults[key]) || oauthResult;
      // Redact sensitive data before caching
      const redactedResult: AccountHealthResult = {
        ...merged,
        message: redactMessage(merged.message),
        errorDescription: redactMessage(merged.errorDescription),
      };
      setHealthCacheEntry(item.email, redactedResult);

      completed++;
      if (options.onProgress) {
        options.onProgress(completed, total, `Finished ${item.email}`);
      }

      return { email: item.email, result: merged };
    }
  );

  for (const entry of checkedResults) {
    items.push({ email: entry.email, result: entry.result });
  }

  const counts: HealthCheckResult["counts"] = {
    total: filteredAccounts.length,
    checked: checkedResults.length,
    skipped: items.filter((item) => item.skipped).length,
    cached: items.filter((item) => item.cached).length,
    byStatus: {
      ok: 0,
      verification_required: 0,
      revoked: 0,
      disabled: 0,
      deleted: 0,
      password_changed: 0,
      network_error: 0,
      unknown_error: 0,
      not_checked: 0,
      not_configured: 0,
    },
  };

  for (const item of items) {
    mergeStatusCounts(counts.byStatus, item.result.status);
  }

  const completedAt = Date.now();

  return {
    items,
    counts,
    timing: {
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
    },
  };
}
