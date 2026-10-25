/**
 * Standalone demo database reset utility.
 * STRICTLY PREVENTED FROM RUNNING IN NON-DEV OR PRODUCTION ENVIRONMENTS.
 * Requires:
 * 1. NODE_ENV explicitly set to "development" or "test"
 * 2. DATABASE_URL explicitly pointing to an allowed local demo database (*dev.db, *demo.db, *test.db)
 * 3. Explicit CLI flag: --confirm-reset-demo
 * 4. Explicit confirmation env: CONFIRM_DEMO_RESET="true"
 */

const ALLOWED_DEMO_DB_REGEX = /(dev|demo|test)\.db(\?.*)?$/i;
const FORBIDDEN_REMOTE_DB_PREFIXES = ["postgres://", "postgresql://", "mysql://", "sqlserver://", "mongodb://"];

/**
 * Validates safety guards before any database wipe can occur.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
function verifyResetSafetyGuards(env = process.env, argv = process.argv) {
  const nodeEnv = env.NODE_ENV;

  // Guard 1: Strict NODE_ENV check (never assume unset is development)
  if (!nodeEnv || (nodeEnv !== "development" && nodeEnv !== "test")) {
    return {
      allowed: false,
      reason: `ความปลอดภัย: ไม่อนุญาตให้รีเซ็ตฐานข้อมูลเมื่อ NODE_ENV ไม่ได้ระบุหรือไม่ได้เป็น 'development' หรือ 'test' (ปัจจุบัน: '${nodeEnv || "unset"}')`,
    };
  }

  // Guard 2: Destination database URL check
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl || typeof dbUrl !== "string") {
    return {
      allowed: false,
      reason: "ความปลอดภัย: ไม่พบค่า DATABASE_URL หรือไม่ได้กำหนดค่า",
    };
  }

  const isRemote = FORBIDDEN_REMOTE_DB_PREFIXES.some((prefix) => dbUrl.toLowerCase().startsWith(prefix));
  if (isRemote) {
    return {
      allowed: false,
      reason: "ความปลอดภัยขั้นสูง: ห้ามรันรีเซ็ตกับฐานข้อมูลระยะไกล (Cloud / Remote Database) โดยเด็ดขาด",
    };
  }

  if (!ALLOWED_DEMO_DB_REGEX.test(dbUrl.trim())) {
    return {
      allowed: false,
      reason: `ความปลอดภัย: ปลายทางฐานข้อมูล '${dbUrl}' ไม่ใช่ฐานข้อมูลเดโมที่อนุญาต (ต้องลงท้ายด้วย dev.db, demo.db หรือ test.db)`,
    };
  }

  // Guard 3: Double confirmation requirement (CLI flag and ENV confirmation)
  const hasCliFlag = argv.includes("--confirm-reset-demo");
  const hasEnvConfirm = env.CONFIRM_DEMO_RESET === "true";

  if (!hasCliFlag || !hasEnvConfirm) {
    return {
      allowed: false,
      reason:
        "ความปลอดภัย: ต้องการการยืนยันแบบสองชั้น (Double Confirmation)\n" +
        "1. ต้องใส่ argument: --confirm-reset-demo\n" +
        "2. ต้องกำหนด Environment Variable: CONFIRM_DEMO_RESET=true\n" +
        "ตัวอย่าง: CONFIRM_DEMO_RESET=true npm run db:reset-demo -- --confirm-reset-demo",
    };
  }

  return { allowed: true };
}

async function resetDemoDb() {
  const guard = verifyResetSafetyGuards(process.env, process.argv);
  if (!guard.allowed) {
    console.error("❌ SAFETY GUARD TRIGGERED:");
    console.error(guard.reason);
    process.exit(1);
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("🧹 Wiping verified local demo database tables...");

    await prisma.queueTrackingToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.adminPermission.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.queueSequence.deleteMany({});

    console.log("✅ Verified demo database successfully cleaned.");
    console.log("Run 'npm run db:seed' to re-populate initial data.");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  resetDemoDb().catch((err) => {
    console.error("Reset error:", err);
    process.exit(1);
  });
}

module.exports = {
  verifyResetSafetyGuards,
};
