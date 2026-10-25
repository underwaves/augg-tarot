import test, { describe, it } from "node:test";
import assert from "node:assert";
import {
  isValidCalendarDate,
  parseStrictInteger,
  parseStrictNonNegativeInteger,
  parseStrictBoolean,
  parsePaginationParams,
  createQueueSchema,
  updateQueueSchema,
  updateUserSchema,
} from "../lib/validation";

describe("Input Validation Suite", () => {
  describe("Calendar Date Validation", () => {
    it("should accept valid calendar dates", () => {
      assert.strictEqual(isValidCalendarDate("2026-10-25"), true);
      assert.strictEqual(isValidCalendarDate("2024-02-29"), true); // Leap year
      assert.strictEqual(isValidCalendarDate("2025-12-31"), true);
    });

    it("should reject impossible or invalid calendar dates (e.g. 2099-99-99)", () => {
      assert.strictEqual(isValidCalendarDate("2099-99-99"), false);
      assert.strictEqual(isValidCalendarDate("2024-02-30"), false);
      assert.strictEqual(isValidCalendarDate("2023-02-29"), false); // Non-leap year
      assert.strictEqual(isValidCalendarDate("2025-04-31"), false); // April has 30 days
      assert.strictEqual(isValidCalendarDate("2025-13-01"), false); // Month 13
      assert.strictEqual(isValidCalendarDate("invalid-date"), false);
      assert.strictEqual(isValidCalendarDate(""), false);
    });
  });

  describe("Strict Integer Validation", () => {
    it("should accept real integers and pure numeric strings", () => {
      assert.deepStrictEqual(parseStrictInteger(5), { success: true, value: 5 });
      assert.deepStrictEqual(parseStrictInteger(0), { success: true, value: 0 });
      assert.deepStrictEqual(parseStrictInteger("12"), { success: true, value: 12 });
      assert.deepStrictEqual(parseStrictInteger("-3"), { success: true, value: -3 });
    });

    it("should strictly reject non-integer strings like '3abc' and floats", () => {
      const res1 = parseStrictInteger("3abc");
      assert.strictEqual(res1.success, false);

      const res2 = parseStrictInteger("abc3");
      assert.strictEqual(res2.success, false);

      const res3 = parseStrictInteger(3.14);
      assert.strictEqual(res3.success, false);

      const res4 = parseStrictInteger("3.5");
      assert.strictEqual(res4.success, false);

      const res5 = parseStrictInteger(true);
      assert.strictEqual(res5.success, false);
    });

    it("should enforce non-negative constraint for questionCount", () => {
      assert.deepStrictEqual(parseStrictNonNegativeInteger(0), { success: true, value: 0 });
      assert.deepStrictEqual(parseStrictNonNegativeInteger(3), { success: true, value: 3 });
      assert.deepStrictEqual(parseStrictNonNegativeInteger("5"), { success: true, value: 5 });

      const neg = parseStrictNonNegativeInteger(-1);
      assert.strictEqual(neg.success, false);

      const badStr = parseStrictNonNegativeInteger("3abc");
      assert.strictEqual(badStr.success, false);
    });
  });

  describe("Strict Boolean Validation", () => {
    it("should accept actual booleans", () => {
      assert.deepStrictEqual(parseStrictBoolean(true), { success: true, value: true });
      assert.deepStrictEqual(parseStrictBoolean(false), { success: true, value: false });
    });

    it("should reject string 'false' and 'true' to prevent truthy coercion bugs", () => {
      const resFalseStr = parseStrictBoolean("false");
      assert.strictEqual(resFalseStr.success, false);

      const resTrueStr = parseStrictBoolean("true");
      assert.strictEqual(resTrueStr.success, false);

      const resNum = parseStrictBoolean(0);
      assert.strictEqual(resNum.success, false);
    });
  });

  describe("Pagination Parameters Parser", () => {
    it("should parse valid pagination params", () => {
      const params = new URLSearchParams("page=2&limit=50");
      const res = parsePaginationParams(params);
      assert.deepStrictEqual(res, { page: 2, limit: 50, skip: 50 });
    });

    it("should reject invalid non-integer or out-of-range pagination", () => {
      const badPage = parsePaginationParams(new URLSearchParams("page=abc&limit=10"));
      assert.strictEqual("error" in badPage, true);

      const zeroPage = parsePaginationParams(new URLSearchParams("page=0&limit=10"));
      assert.strictEqual("error" in zeroPage, true);

      const badLimit = parsePaginationParams(new URLSearchParams("page=1&limit=500"));
      assert.strictEqual("error" in badLimit, true);
    });
  });

  describe("Zod Schemas", () => {
    it("createQueueSchema rejects invalid calendar dates and '3abc' question count", () => {
      const badDate = createQueueSchema.safeParse({
        nickname: "คุณมินนี่",
        queueDate: "2099-99-99",
        packageName: "Tarot 3 Cards",
        questionCount: 3,
      });
      assert.strictEqual(badDate.success, false);

      const badQuestions = createQueueSchema.safeParse({
        nickname: "คุณมินนี่",
        queueDate: "2026-10-25",
        packageName: "Tarot 3 Cards",
        questionCount: "3abc",
      });
      assert.strictEqual(badQuestions.success, false);

      const valid = createQueueSchema.safeParse({
        nickname: "คุณมินนี่",
        queueDate: "2026-10-25",
        packageName: "Tarot 3 Cards",
        questionCount: 3,
      });
      assert.strictEqual(valid.success, true);
    });

    it("updateUserSchema rejects string 'false' for isActive", () => {
      const invalid = updateUserSchema.safeParse({
        isActive: "false",
      });
      assert.strictEqual(invalid.success, false);

      const valid = updateUserSchema.safeParse({
        isActive: false,
      });
      assert.strictEqual(valid.success, true);
    });
  });
});
