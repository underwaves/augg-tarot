import { z } from "zod";
import { PERMISSION_KEYS, PermissionKey } from "./types";

/**
 * Validates whether a string is a real valid calendar date in YYYY-MM-DD format.
 * Rejects invalid dates such as 2099-99-99, 2024-02-30, or 2023-02-29.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const parts = dateStr.split("-").map(Number);
  const [year, month, day] = parts;

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2150) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validates that an input is strictly an integer.
 * Rejects strings containing non-digits (e.g. "3abc"), floats (e.g. 3.5), objects, booleans.
 */
export function parseStrictInteger(val: unknown): { success: true; value: number } | { success: false; error: string } {
  if (val === null || val === undefined) {
    return { success: false, error: "ค่าต้องไม่เป็นค่าว่าง" };
  }
  if (typeof val === "boolean") {
    return { success: false, error: "ค่าต้องเป็นตัวเลขจำนวนเต็ม ไม่ใช่ boolean" };
  }
  if (typeof val === "number") {
    if (!Number.isFinite(val) || !Number.isInteger(val)) {
      return { success: false, error: "ค่าต้องเป็นตัวเลขจำนวนเต็ม" };
    }
    return { success: true, value: val };
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      return { success: false, error: "ค่าต้องเป็นตัวเลขจำนวนเต็มเท่านั้น ปฏิเสธค่าที่มีตัวอักษรหรือทศนิยมปน" };
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) {
      return { success: false, error: "ตัวเลขเกินขอบเขตที่รองรับ" };
    }
    return { success: true, value: parsed };
  }
  return { success: false, error: "ชนิดข้อมูลไม่ถูกต้อง ต้องเป็นตัวเลขจำนวนเต็ม" };
}

/**
 * Validates that an input is strictly a non-negative integer (>= 0).
 */
export function parseStrictNonNegativeInteger(val: unknown): { success: true; value: number } | { success: false; error: string } {
  const res = parseStrictInteger(val);
  if (!res.success) return res;
  if (res.value < 0) {
    return { success: false, error: "ค่าต้องเป็นตัวเลข 0 หรือมากกว่า" };
  }
  return res;
}

/**
 * Validates that an input is strictly a boolean.
 * Rejects strings such as "false" or "true" to prevent false truthy coercion.
 */
export function parseStrictBoolean(val: unknown): { success: true; value: boolean } | { success: false; error: string } {
  if (typeof val === "boolean") {
    return { success: true, value: val };
  }
  return { success: false, error: "ค่าต้องเป็น boolean (true หรือ false) เท่านั้น ห้ามส่งเป็นสตริงหรือชนิดอื่น" };
}

/**
 * Helper to extract clean error message from ZodError
 */
export function formatZodError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    return error.issues[0].message;
  }
  return "ข้อมูลที่ส่งมาไม่ถูกต้อง";
}

// Zod schema for real YYYY-MM-DD calendar date
export const realCalendarDateSchema = z
  .string()
  .min(1, "กรุณาระบุวันที่")
  .refine(isValidCalendarDate, {
    message: "รูปแบบวันที่ไม่ถูกต้องหรือไม่ใช่วันที่มีอยู่จริงในปฏิทิน (ต้องเป็น YYYY-MM-DD)",
  });

// Zod schema for strict non-negative integer
export const strictNonNegativeIntegerSchema = z
  .custom<number>((val) => {
    return parseStrictNonNegativeInteger(val).success;
  }, {
    message: "จำนวนต้องเป็นตัวเลขจำนวนเต็ม 0 หรือมากกว่าเท่านั้น ห้ามมีตัวอักษรหรือทศนิยมปน",
  })
  .transform((val) => {
    const res = parseStrictNonNegativeInteger(val);
    if (!res.success) throw new Error(res.error);
    return res.value;
  });

// Zod schema for strict boolean
export const strictBooleanSchema = z.custom<boolean>((val) => {
  return typeof val === "boolean";
}, {
  message: "ค่าต้องเป็น boolean (true หรือ false) จริงเท่านั้น ห้ามส่งเป็นสตริง",
});

// Zod schema for Permission keys
export const permissionKeySchema = z.custom<PermissionKey>((val) => {
  return typeof val === "string" && (PERMISSION_KEYS as readonly string[]).includes(val);
}, {
  message: "รหัสสิทธิ์ไม่ถูกต้อง",
});

// Queue creation validation schema
export const createQueueSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อเล่นลูกค้า")
    .max(100, "ชื่อเล่นต้องไม่เกิน 100 ตัวอักษร"),
  queueDate: realCalendarDateSchema,
  packageName: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อแพ็กเกจ")
    .max(200, "ชื่อแพ็กเกจต้องไม่เกิน 200 ตัวอักษร"),
  questionCount: strictNonNegativeIntegerSchema,
  details: z.string().trim().max(2000, "รายละเอียดต้องไม่เกิน 2000 ตัวอักษร").nullable().optional(),
  internalNote: z.string().trim().max(2000, "หมายเหตุภายในต้องไม่เกิน 2000 ตัวอักษร").nullable().optional(),
  initialStatus: z.enum(["waiting", "in_progress"]).optional().default("waiting"),
});

// Queue update validation schema
export const updateQueueSchema = z.object({
  nickname: z.string().trim().min(1, "ชื่อเล่นต้องไม่เป็นค่าว่าง").max(100).optional(),
  queueDate: realCalendarDateSchema.optional(),
  packageName: z.string().trim().min(1, "ชื่อแพ็กเกจต้องไม่เป็นค่าว่าง").max(200).optional(),
  questionCount: strictNonNegativeIntegerSchema.optional(),
  details: z.string().trim().max(2000).nullable().optional(),
  internalNote: z.string().trim().max(2000).nullable().optional(),
  assignedTo: z.string().uuid("รหัสผู้รับผิดชอบต้องเป็น UUID").nullable().optional(),
});

// User creation validation schema
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .max(255),
  displayName: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อแสดงผล")
    .max(100, "ชื่อแสดงผลต้องไม่เกิน 100 ตัวอักษร"),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
    .max(128, "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร"),
  permissions: z.array(permissionKeySchema).optional().default([]),
});

// User update validation schema
export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1, "ชื่อแสดงผลต้องไม่เป็นค่าว่าง").max(100).optional(),
  isActive: strictBooleanSchema.optional(),
  newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร").max(128).optional(),
  permissions: z.array(permissionKeySchema).optional(),
  role: z.enum(["owner", "admin"]).optional(),
});

// Pagination parser with strict ranges
export function parsePaginationParams(searchParams: URLSearchParams, defaultLimit = 20, maxLimit = 100) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");

  let page = 1;
  let limit = defaultLimit;

  if (pageRaw !== null && pageRaw !== "") {
    const res = parseStrictInteger(pageRaw);
    if (!res.success || res.value < 1) {
      return { error: "พารามิเตอร์ page ต้องเป็นตัวเลขจำนวนเต็มที่มากกว่าหรือเท่ากับ 1" };
    }
    page = res.value;
  }

  if (limitRaw !== null && limitRaw !== "") {
    const res = parseStrictInteger(limitRaw);
    if (!res.success || res.value < 1 || res.value > maxLimit) {
      return { error: `พารามิเตอร์ limit ต้องเป็นตัวเลขจำนวนเต็มระหว่าง 1 ถึง ${maxLimit}` };
    }
    limit = res.value;
  }

  return { page, limit, skip: (page - 1) * limit };
}
