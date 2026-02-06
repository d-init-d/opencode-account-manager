const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
  normalizePluginAccounts,
  createEmptyPluginAccountsFile,
  mergeAccount,
  mergeAccounts,
  buildPortableExport,
  detectImportFormat,
  extractAccountsFromImport,
  sanitizeAccountForPublic,
  summarizeAccounts,
} = require("../dist/core/accounts.js");

describe("accounts module", () => {
  describe("createEmptyPluginAccountsFile", () => {
    it("should return empty accounts file with default values", () => {
      const result = createEmptyPluginAccountsFile();
      assert.strictEqual(result.version, 3);
      assert.deepStrictEqual(result.accounts, []);
      assert.strictEqual(result.activeIndex, 0);
      assert.deepStrictEqual(result.activeIndexByFamily, {});
    });
  });

  describe("normalizePluginAccounts", () => {
    it("should filter out invalid accounts", () => {
      const data = {
        version: 3,
        accounts: [
          { email: "test@example.com", refreshToken: "token123" },
          { email: "invalid", refreshToken: "token456" },
          { email: "test2@example.com", refreshToken: "" },
          { email: "test3@example.com", refreshToken: "token789" },
        ],
        activeIndex: 0,
      };
      const result = normalizePluginAccounts(data);
      assert.strictEqual(result.accounts.length, 2);
      assert.strictEqual(result.accounts[0].email, "test@example.com");
      assert.strictEqual(result.accounts[1].email, "test3@example.com");
    });

    it("should normalize email to lowercase", () => {
      const data = {
        version: 3,
        accounts: [{ email: "TEST@EXAMPLE.COM", refreshToken: "token123" }],
        activeIndex: 0,
      };
      const result = normalizePluginAccounts(data);
      assert.strictEqual(result.accounts[0].email, "test@example.com");
    });

    it("should handle missing accounts array", () => {
      const data = { version: 3 };
      const result = normalizePluginAccounts(data);
      assert.deepStrictEqual(result.accounts, []);
    });
  });

  describe("mergeAccount", () => {
    it("should merge two accounts preserving existing data", () => {
      const existing = {
        email: "test@example.com",
        refreshToken: "oldToken",
        fingerprint: "fp1",
      };
      const incoming = {
        email: "test@example.com",
        refreshToken: "newToken",
        fingerprint: "fp2",
      };
      const result = mergeAccount(existing, incoming);
      assert.strictEqual(result.email, "test@example.com");
      assert.strictEqual(result.refreshToken, "newToken");
      assert.strictEqual(result.fingerprint, "fp2");
    });

    it("should preserve existing values when incoming is missing", () => {
      const existing = {
        email: "test@example.com",
        refreshToken: "oldToken",
        fingerprint: "fp1",
      };
      const incoming = {
        email: "test@example.com",
        refreshToken: "newToken",
      };
      const result = mergeAccount(existing, incoming);
      assert.strictEqual(result.fingerprint, "fp1");
    });
  });

  describe("mergeAccounts", () => {
    it("should merge accounts in merge mode", () => {
      const existing = {
        version: 3,
        accounts: [{ email: "a@example.com", refreshToken: "token1" }],
        activeIndex: 0,
        activeIndexByFamily: {},
      };
      const incoming = [{ email: "b@example.com", refreshToken: "token2" }];
      const result = mergeAccounts(existing, incoming, "merge");
      assert.strictEqual(result.accounts.length, 2);
    });

    it("should replace accounts in replace mode", () => {
      const existing = {
        version: 3,
        accounts: [{ email: "a@example.com", refreshToken: "token1" }],
        activeIndex: 0,
        activeIndexByFamily: {},
      };
      const incoming = [{ email: "b@example.com", refreshToken: "token2" }];
      const result = mergeAccounts(existing, incoming, "replace");
      assert.strictEqual(result.accounts.length, 1);
      assert.strictEqual(result.accounts[0].email, "b@example.com");
    });
  });

  describe("buildPortableExport", () => {
    it("should create portable export with metadata", () => {
      const accounts = [{ email: "test@example.com", refreshToken: "token123" }];
      const result = buildPortableExport(accounts);
      assert.strictEqual(result.version, 1);
      assert.strictEqual(result.exportedFrom, "opencode-account-manager");
      assert.strictEqual(result.accounts.length, 1);
      assert.ok(typeof result.exportedAt === "number");
    });
  });

  describe("detectImportFormat", () => {
    it("should detect portable format", () => {
      const data = { exportedFrom: "opencode-account-manager", accounts: [] };
      assert.strictEqual(detectImportFormat(data), "portable");
    });

    it("should detect plugin format", () => {
      const data = { version: 3, accounts: [] };
      assert.strictEqual(detectImportFormat(data), "plugin");
    });

    it("should return unknown for invalid data", () => {
      assert.strictEqual(detectImportFormat(null), "unknown");
      assert.strictEqual(detectImportFormat("string"), "unknown");
      assert.strictEqual(detectImportFormat({}), "unknown");
    });
  });

  describe("extractAccountsFromImport", () => {
    it("should extract from array", () => {
      const data = [{ email: "test@example.com", refreshToken: "token123" }];
      const result = extractAccountsFromImport(data);
      assert.strictEqual(result.length, 1);
    });

    it("should extract from portable format", () => {
      const data = {
        exportedFrom: "opencode-account-manager",
        accounts: [{ email: "test@example.com", refreshToken: "token123" }],
      };
      const result = extractAccountsFromImport(data);
      assert.strictEqual(result.length, 1);
    });

    it("should throw on unknown format", () => {
      assert.throws(() => extractAccountsFromImport({ foo: "bar" }), /Unsupported import format/);
    });
  });

  describe("sanitizeAccountForPublic", () => {
    it("should remove refreshToken", () => {
      const account = { email: "test@example.com", refreshToken: "secret" };
      const result = sanitizeAccountForPublic(account);
      assert.strictEqual(result.refreshToken, undefined);
      assert.strictEqual(result.email, "test@example.com");
    });
  });

  describe("summarizeAccounts", () => {
    it("should count total accounts", () => {
      const accounts = [
        { email: "a@example.com", refreshToken: "t1" },
        { email: "b@example.com", refreshToken: "t2" },
      ];
      const result = summarizeAccounts(accounts);
      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.available, 2);
      assert.strictEqual(result.limited, 0);
    });

    it("should count rate-limited accounts", () => {
      const future = Date.now() + 1000000;
      const accounts = [
        { email: "a@example.com", refreshToken: "t1", rateLimitResetTimes: { claude: future } },
        { email: "b@example.com", refreshToken: "t2" },
      ];
      const result = summarizeAccounts(accounts);
      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.limited, 1);
      assert.strictEqual(result.available, 1);
    });
  });
});
