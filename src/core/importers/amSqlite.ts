import Database from "better-sqlite3";
import { Account } from "../types";
import { safeParseJson, toLowerTrim } from "../utils";

export interface AmColumnMap {
  email: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt?: string;
  lastUsed?: string;
  fingerprint?: string;
  rateLimitResetTimes?: string;
}

export interface AmImportOptions {
  dbPath: string;
  table?: string;
  columnMap?: Partial<AmColumnMap>;
}

const COLUMN_ALIASES: Record<keyof AmColumnMap, string[]> = {
  email: ["email", "account_email", "user_email", "google_email"],
  refreshToken: [
    "refresh_token",
    "refreshToken",
    "oauth_refresh_token",
    "token",
  ],
  projectId: ["project_id", "projectId"],
  managedProjectId: ["managed_project_id", "managedProjectId"],
  addedAt: ["added_at", "addedAt", "created_at", "createdAt"],
  lastUsed: ["last_used", "lastUsed", "last_used_at", "updated_at", "updatedAt"],
  fingerprint: ["fingerprint", "device_fingerprint"],
  rateLimitResetTimes: [
    "rate_limit_reset_times",
    "rateLimitResetTimes",
  ],
};

function listTables(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

function listColumns(db: Database.Database, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(\"${table}\")`).all() as {
    name: string;
  }[];
  return rows.map((row) => row.name);
}

function resolveColumn(
  columns: string[],
  aliases: string[]
): string | undefined {
  const lowerMap = new Map<string, string>();
  for (const column of columns) {
    lowerMap.set(column.toLowerCase(), column);
  }
  for (const alias of aliases) {
    const match = lowerMap.get(alias.toLowerCase());
    if (match) return match;
  }
  return undefined;
}

function buildColumnMap(
  columns: string[],
  overrides?: Partial<AmColumnMap>
): AmColumnMap | null {
  const map: Partial<AmColumnMap> = {};

  const required: (keyof AmColumnMap)[] = ["email", "refreshToken"];
  const optional: (keyof AmColumnMap)[] = [
    "projectId",
    "managedProjectId",
    "addedAt",
    "lastUsed",
    "fingerprint",
    "rateLimitResetTimes",
  ];

  for (const key of [...required, ...optional]) {
    const override = overrides?.[key];
    if (override) {
      if (!columns.includes(override)) {
        throw new Error(
          `Column override ${override} for ${key} not found in table.`
        );
      }
      map[key] = override;
      continue;
    }

    const resolved = resolveColumn(columns, COLUMN_ALIASES[key]);
    if (resolved) {
      map[key] = resolved;
    }
  }

  for (const key of required) {
    if (!map[key]) return null;
  }

  return map as AmColumnMap;
}

function scoreColumnMap(map: AmColumnMap): number {
  let score = 0;
  for (const value of Object.values(map)) {
    if (value) score += 1;
  }
  return score;
}

function detectTableAndColumns(
  db: Database.Database,
  overrides?: Partial<AmColumnMap>
): { table: string; columnMap: AmColumnMap } | null {
  const tables = listTables(db);
  let best: { table: string; columnMap: AmColumnMap; score: number } | null = null;

  for (const table of tables) {
    const columns = listColumns(db, table);
    const map = buildColumnMap(columns, overrides);
    if (!map) continue;
    const score = scoreColumnMap(map);
    if (!best || score > best.score) {
      best = { table, columnMap: map, score };
    }
  }

  if (!best) return null;
  return { table: best.table, columnMap: best.columnMap };
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value === "string") {
    return safeParseJson(value) ?? value;
  }
  return value;
}

export function importFromAmDatabase(options: AmImportOptions): Account[] {
  const db = new Database(options.dbPath, { readonly: true });
  try {
    let table = options.table;
    let columnMap: AmColumnMap | null = null;

    if (table) {
      const columns = listColumns(db, table);
      columnMap = buildColumnMap(columns, options.columnMap);
      if (!columnMap) {
        throw new Error(
          `Table ${table} does not contain required columns (email, refreshToken).`
        );
      }
    } else {
      const detected = detectTableAndColumns(db, options.columnMap);
      if (!detected) {
        throw new Error(
          "No compatible table found. Use am:inspect to review table schemas."
        );
      }
      table = detected.table;
      columnMap = detected.columnMap;
    }

    const columns = Object.values(columnMap)
      .filter(Boolean)
      .map((column) => `\"${column}\"`)
      .join(", ");
    const rows = db.prepare(`SELECT ${columns} FROM \"${table}\"`).all() as Record<
      string,
      unknown
    >[];

    return rows
      .map((row) => {
        const email = String(row[columnMap!.email] ?? "").trim();
        const refreshToken = row[columnMap!.refreshToken]
          ? String(row[columnMap!.refreshToken])
          : undefined;
        if (!email) return null;

        const fingerprint = parseMaybeJson(row[columnMap!.fingerprint || ""]);
        const rateLimitResetTimes = parseMaybeJson(
          row[columnMap!.rateLimitResetTimes || ""]
        );

        return {
          email,
          refreshToken,
          projectId: columnMap!.projectId
            ? String(row[columnMap!.projectId] || "") || undefined
            : undefined,
          managedProjectId: columnMap!.managedProjectId
            ? String(row[columnMap!.managedProjectId] || "") || undefined
            : undefined,
          addedAt: columnMap!.addedAt
            ? Number(row[columnMap!.addedAt]) || undefined
            : undefined,
          lastUsed: columnMap!.lastUsed
            ? Number(row[columnMap!.lastUsed]) || undefined
            : undefined,
          fingerprint:
            fingerprint && typeof fingerprint === "object"
              ? (fingerprint as Account["fingerprint"])
              : undefined,
          rateLimitResetTimes:
            rateLimitResetTimes && typeof rateLimitResetTimes === "object"
              ? (rateLimitResetTimes as Account["rateLimitResetTimes"])
              : undefined,
        } as Account;
      })
      .filter((account): account is Account => Boolean(account))
      .filter((account) => toLowerTrim(account.email).length > 3);
  } finally {
    db.close();
  }
}

export function inspectAmDatabase(dbPath: string): {
  tables: { name: string; columns: string[] }[];
} {
  const db = new Database(dbPath, { readonly: true });
  try {
    const tables = listTables(db).map((table) => ({
      name: table,
      columns: listColumns(db, table),
    }));
    return { tables };
  } finally {
    db.close();
  }
}
