const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
  mergeAccountHealth,
  redactMessage,
} = require("../dist/core/health-log.js");

describe("health-log module", () => {
  describe("mergeAccountHealth", () => {
    it("should return right when left is undefined", () => {
      const right = { status: "ok", source: "log", checkedAt: 1000 };
      const result = mergeAccountHealth(undefined, right);
      assert.deepStrictEqual(result, right);
    });

    it("should return left when right is undefined", () => {
      const left = { status: "ok", source: "log", checkedAt: 1000 };
      const result = mergeAccountHealth(left, undefined);
      assert.deepStrictEqual(result, left);
    });

    it("should prefer higher priority status", () => {
      const left = { status: "ok", source: "log", checkedAt: 1000 };
      const right = { status: "disabled", source: "log", checkedAt: 1000 };
      const result = mergeAccountHealth(left, right);
      assert.strictEqual(result?.status, "disabled");
    });

    it("should prefer more recent check when same priority", () => {
      const left = { status: "ok", source: "log", checkedAt: 1000 };
      const right = { status: "ok", source: "log", checkedAt: 2000 };
      const result = mergeAccountHealth(left, right);
      assert.strictEqual(result?.checkedAt, 2000);
    });

    it("should prefer oauth source when same time", () => {
      const left = { status: "ok", source: "cache", checkedAt: 1000 };
      const right = { status: "ok", source: "oauth", checkedAt: 1000 };
      const result = mergeAccountHealth(left, right);
      assert.strictEqual(result?.source, "oauth");
    });
  });

  describe("redactMessage", () => {
    it("should return undefined for undefined input", () => {
      const result = redactMessage(undefined);
      assert.strictEqual(result, undefined);
    });

    it("should redact token patterns", () => {
      const message = "Error: token=abc123xyz and token: \"secret\"";
      const result = redactMessage(message);
      assert.ok(!result?.includes("abc123xyz"));
      assert.ok(!result?.includes("secret"));
      assert.ok(result?.includes("token=***"));
    });

    it("should redact refresh_token patterns", () => {
      const message = "Error: refresh_token=xyz789abc";
      const result = redactMessage(message);
      assert.ok(!result?.includes("xyz789abc"));
      assert.ok(result?.includes("refresh_token=***"));
    });

    it("should redact long email addresses", () => {
      const message = "Error for verylongemailaddress@example.com occurred";
      const result = redactMessage(message);
      assert.ok(!result?.includes("verylongemailaddress@example.com"));
      assert.ok(result?.includes("@example.com"));
    });

    it("should keep short emails unchanged", () => {
      const message = "Error for a@b.co occurred";
      const result = redactMessage(message);
      assert.ok(result?.includes("a@b.co"));
    });

    it("should handle multiple sensitive patterns", () => {
      const message = "token=secret123 refresh_token=secret456 longemailaddress@domain.com";
      const result = redactMessage(message);
      assert.ok(result?.includes("token=***"));
      assert.ok(result?.includes("refresh_token=***"));
      assert.ok(!result?.includes("secret123"));
      assert.ok(!result?.includes("secret456"));
    });
  });
});
