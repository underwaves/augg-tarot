import test, { describe, it } from "node:test";
import assert from "node:assert";
import { verifyResetSafetyGuards } from "../scripts/reset-demo-db";
const { evaluateSeedConfig } = require("../prisma/seed");

describe("Seed and Reset Safety Guards Suite", () => {
  describe("Seed Configuration Guards (prisma/seed.js)", () => {
    it("MUST NOT assume unset NODE_ENV is development", () => {
      const config = evaluateSeedConfig({});
      assert.strictEqual(config.isExplicitDev, false);
      assert.strictEqual(config.allowDefaultDevAccounts, false);
      assert.strictEqual(config.seedDemoData, false);
      assert.strictEqual(config.ownerEmail, "");
      assert.strictEqual(config.ownerPassword, "");
    });

    it("MUST NOT enable default dev credentials or demo data in production", () => {
      const config = evaluateSeedConfig({
        NODE_ENV: "production",
        ENABLE_DEFAULT_DEV_ACCOUNTS: "true",
        SEED_DEMO_DATA: "true",
      });
      assert.strictEqual(config.isExplicitDev, false);
      assert.strictEqual(config.allowDefaultDevAccounts, false);
      assert.strictEqual(config.seedDemoData, false);
      assert.strictEqual(config.ownerEmail, "");
      assert.strictEqual(config.ownerPassword, "");
    });

    it("In development, requires ENABLE_DEFAULT_DEV_ACCOUNTS=true to seed default dev credentials", () => {
      const withoutFlag = evaluateSeedConfig({ NODE_ENV: "development" });
      assert.strictEqual(withoutFlag.isExplicitDev, true);
      assert.strictEqual(withoutFlag.allowDefaultDevAccounts, false);
      assert.strictEqual(withoutFlag.ownerEmail, "");

      const withFlag = evaluateSeedConfig({
        NODE_ENV: "development",
        ENABLE_DEFAULT_DEV_ACCOUNTS: "true",
      });
      assert.strictEqual(withFlag.allowDefaultDevAccounts, true);
      assert.strictEqual(withFlag.ownerEmail, "owner@magicaltarot.com");
      assert.strictEqual(withFlag.adminEmail, "admin@magicaltarot.com");
    });

    it("In development, requires SEED_DEMO_DATA=true to seed sample demo queues", () => {
      const withoutFlag = evaluateSeedConfig({ NODE_ENV: "development" });
      assert.strictEqual(withoutFlag.seedDemoData, false);

      const withFlag = evaluateSeedConfig({
        NODE_ENV: "development",
        SEED_DEMO_DATA: "true",
      });
      assert.strictEqual(withFlag.seedDemoData, true);
    });

    it("Allows explicit production bootstrap credentials", () => {
      const prodBootstrap = evaluateSeedConfig({
        NODE_ENV: "production",
        INITIAL_OWNER_EMAIL: "realowner@example.com",
        INITIAL_OWNER_PASSWORD: "SuperSecurePassword123!",
      });
      assert.strictEqual(prodBootstrap.ownerEmail, "realowner@example.com");
      assert.strictEqual(prodBootstrap.ownerPassword, "SuperSecurePassword123!");
      assert.strictEqual(prodBootstrap.seedDemoData, false);
    });
  });

  describe("Database Reset Safety Guards (scripts/reset-demo-db.js)", () => {
    it("MUST reject database reset when NODE_ENV is unset", () => {
      const res = verifyResetSafetyGuards(
        { DATABASE_URL: "file:./dev.db", CONFIRM_DEMO_RESET: "true" } as any,
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(res.allowed, false);
      assert.match(res.reason || "", /NODE_ENV/);
    });

    it("MUST reject database reset when NODE_ENV is production", () => {
      const res = verifyResetSafetyGuards(
        { NODE_ENV: "production", DATABASE_URL: "file:./dev.db", CONFIRM_DEMO_RESET: "true" },
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(res.allowed, false);
      assert.match(res.reason || "", /NODE_ENV/);
    });

    it("MUST reject database reset when DATABASE_URL points to remote databases (PostgreSQL/MySQL)", () => {
      const postgresRes = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "postgresql://user:pass@ep-cool-db.aws.neon.tech/main",
          CONFIRM_DEMO_RESET: "true",
        },
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(postgresRes.allowed, false);
      assert.match(postgresRes.reason || "", /Cloud \/ Remote Database/);

      const mysqlRes = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "mysql://root:pass@127.0.0.1:3306/production",
          CONFIRM_DEMO_RESET: "true",
        },
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(mysqlRes.allowed, false);
    });

    it("MUST reject database reset when DATABASE_URL is not an allowed demo file name", () => {
      const res = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "file:./production.db",
          CONFIRM_DEMO_RESET: "true",
        },
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(res.allowed, false);
      assert.match(res.reason || "", /ไม่ใช่ฐานข้อมูลเดโมที่อนุญาต/);
    });

    it("MUST require double confirmation (both CLI argument and CONFIRM_DEMO_RESET=true)", () => {
      // Missing CLI flag
      const missingArg = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "file:./dev.db",
          CONFIRM_DEMO_RESET: "true",
        },
        ["node", "reset-demo-db.js"]
      );
      assert.strictEqual(missingArg.allowed, false);
      assert.match(missingArg.reason || "", /Double Confirmation/);

      // Missing ENV confirmation
      const missingEnv = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "file:./dev.db",
        } as any,
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(missingEnv.allowed, false);
      assert.match(missingEnv.reason || "", /Double Confirmation/);
    });

    it("Allows reset only when all safety conditions are met", () => {
      const res = verifyResetSafetyGuards(
        {
          NODE_ENV: "development",
          DATABASE_URL: "file:./dev.db",
          CONFIRM_DEMO_RESET: "true",
        },
        ["node", "reset-demo-db.js", "--confirm-reset-demo"]
      );
      assert.strictEqual(res.allowed, true);
    });
  });
});
