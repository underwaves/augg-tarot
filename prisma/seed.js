const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashTrackingToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBangkokDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = formatter.format(new Date());
  const seqDateStr = todayStr.replace(/-/g, "");
  return { todayStr, seqDateStr };
}

/**
 * Resolves seed configuration safely according to security rules.
 * Strictly prevents treating unset NODE_ENV as development.
 * Requires explicit configuration to seed default accounts or sample demo data.
 */
function evaluateSeedConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV;
  // Strict Rule 1: Never assume unset NODE_ENV is development
  const isExplicitDev = nodeEnv === "development";

  // Strict Rule 2: Default accounts only allowed when explicitly enabled
  const allowDefaultDevAccounts = isExplicitDev && env.ENABLE_DEFAULT_DEV_ACCOUNTS === "true";

  // Strict Rule 3: Demo queues only seeded when explicitly enabled
  const seedDemoData = isExplicitDev && env.SEED_DEMO_DATA === "true";

  const ownerEmail = (env.INITIAL_OWNER_EMAIL || (allowDefaultDevAccounts ? "owner@magicaltarot.com" : "")).trim().toLowerCase();
  const ownerPassword = env.INITIAL_OWNER_PASSWORD || (allowDefaultDevAccounts ? "Password123!" : "");
  const ownerDisplayName = env.INITIAL_OWNER_NAME || "แม่หมออันดา (Shop Owner)";

  const adminEmail = (env.INITIAL_ADMIN_EMAIL || (allowDefaultDevAccounts ? "admin@magicaltarot.com" : "")).trim().toLowerCase();
  const adminPassword = env.INITIAL_ADMIN_PASSWORD || (allowDefaultDevAccounts ? "Password123!" : "");
  const adminDisplayName = env.INITIAL_ADMIN_NAME || "น้องจันทร์เจ้า (Tarot Assistant)";

  return {
    nodeEnv: nodeEnv || "unset/strict",
    isExplicitDev,
    allowDefaultDevAccounts,
    seedDemoData,
    ownerEmail,
    ownerPassword,
    ownerDisplayName,
    adminEmail,
    adminPassword,
    adminDisplayName,
  };
}

async function main() {
  const config = evaluateSeedConfig(process.env);
  console.log(`🌸 Running database seed for Magical Pastel Tarot (Mode: ${config.nodeEnv})...`);

  // 1. Initial Owner Account Setup
  let owner = null;

  if (!config.ownerEmail) {
    const existingOwner = await prisma.profile.findFirst({ where: { role: "owner" } });
    if (existingOwner) {
      console.log(`ℹ️ Existing owner account found (${existingOwner.email}). Preserving existing credentials.`);
      owner = existingOwner;
    } else {
      console.error("❌ Error: No owner account exists and INITIAL_OWNER_EMAIL is not configured.");
      console.error("In non-development environments, you must set INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD.");
      console.error("In development, you can set ENABLE_DEFAULT_DEV_ACCOUNTS=true to use default dev credentials.");
      process.exit(1);
    }
  } else {
    const existingOwner = await prisma.profile.findUnique({ where: { email: config.ownerEmail } });
    if (existingOwner) {
      console.log(`ℹ️ Owner account (${config.ownerEmail}) already exists. Skipping creation to preserve existing credentials.`);
      owner = existingOwner;
    } else {
      if (!config.ownerPassword || config.ownerPassword.length < 8) {
        console.error("❌ Error: INITIAL_OWNER_PASSWORD must be at least 8 characters long.");
        process.exit(1);
      }
      const passwordHash = await bcrypt.hash(config.ownerPassword, 10);
      owner = await prisma.profile.create({
        data: {
          email: config.ownerEmail,
          displayName: config.ownerDisplayName,
          passwordHash,
          role: "owner",
          isActive: true,
        },
      });
      console.log("✨ Initial Owner account created successfully:", owner.email);
    }
  }

  // 2. Initial Admin Account Setup (Optional in Production, Configurable via env)
  let admin = null;
  if (config.adminEmail) {
    const existingAdmin = await prisma.profile.findUnique({ where: { email: config.adminEmail } });
    if (existingAdmin) {
      console.log(`ℹ️ Admin account (${config.adminEmail}) already exists. Skipping creation to preserve existing credentials.`);
      admin = existingAdmin;
    } else {
      if (!config.adminPassword || config.adminPassword.length < 8) {
        console.warn("⚠️ Warning: Admin password is missing or shorter than 8 characters. Skipping admin creation.");
      } else {
        const passwordHash = await bcrypt.hash(config.adminPassword, 10);
        admin = await prisma.profile.create({
          data: {
            email: config.adminEmail,
            displayName: config.adminDisplayName,
            passwordHash,
            role: "admin",
            isActive: true,
          },
        });
        console.log("✨ Initial Admin account created successfully:", admin.email);

        const adminPerms = [
          "view_queues",
          "create_queue",
          "edit_queue",
          "change_status",
          "reorder_queue",
          "cancel_queue",
          "view_history",
          "create_tracking_token",
        ];

        for (const perm of adminPerms) {
          await prisma.adminPermission.create({
            data: {
              userId: admin.id,
              permissionKey: perm,
              grantedBy: owner.id,
            },
          });
        }
      }
    }
  }

  // 3. Demo Queues and Tokens
  // STRICT RULE: Only seed demo data if explicitly enabled via SEED_DEMO_DATA=true in development
  if (!config.seedDemoData) {
    console.log("🔒 Skipping sample demo queues and demo tokens (SEED_DEMO_DATA is not 'true').");
  } else {
    const existingQueueCount = await prisma.queue.count();
    if (existingQueueCount > 0) {
      console.log(`ℹ️ Database already contains ${existingQueueCount} queue(s). Skipping demo queue creation.`);
    } else {
      console.log("🔮 Seeding sample demo queues for development...");
      const { todayStr, seqDateStr } = getBangkokDate();

      await prisma.queueSequence.upsert({
        where: { sequenceDate: seqDateStr },
        create: {
          sequenceDate: seqDateStr,
          lastNumber: 5,
        },
        update: {
          lastNumber: Math.max(5),
        },
      });

      const sampleQueues = [
        {
          queueNumber: `TQ-${seqDateStr}-0001`,
          queueDate: todayStr,
          queueOrder: 1,
          nickname: "คุณมินนี่",
          packageName: "เซ็ตคู่รัก",
          questionCount: 3,
          details: "ต้องการดูแนวโน้มความสัมพันธ์กับคนคุยปัจจุบัน และโอกาสพัฒนา",
          internalNote: "ลูกค้าประจำ โอนผ่านพร้อมเพย์แล้ว ส่งผลทางไลน์",
          status: "in_progress",
          createdBy: owner.id,
        },
        {
          queueNumber: `TQ-${seqDateStr}-0002`,
          queueDate: todayStr,
          queueOrder: 2,
          nickname: "คุณพลอยใส",
          packageName: "เซ็ตการงาน",
          questionCount: 5,
          details: "กำลังตัดสินใจเปลี่ยนงานใหม่ สัมภาษณ์ผ่านแล้ว 2 ที่",
          internalNote: "นัดส่งผลช่วงบ่าย 14:00 น.",
          status: "waiting",
          createdBy: admin ? admin.id : owner.id,
        },
        {
          queueNumber: `TQ-${seqDateStr}-0003`,
          queueDate: todayStr,
          queueOrder: 3,
          nickname: "คุณน้ำหวาน",
          packageName: "เริ่มต้น (ไม่ละเอียด)",
          questionCount: 3,
          details: "1. เรื่องเรียนต่อ ตปท. 2. สอบชิงทุน 3. โชคลาภปลายปี",
          internalNote: "ทักมาจาก Instagram",
          status: "waiting",
          createdBy: owner.id,
        },
        {
          queueNumber: `TQ-${seqDateStr}-0004`,
          queueDate: todayStr,
          queueOrder: 4,
          nickname: "คุณพีชชี่",
          packageName: "เซ็ตภาพรวมชีวิต",
          questionCount: 1,
          details: "ภาพรวม 12 เดือนข้างหน้าด้านสุขภาพ โชคลาภ และบริวาร",
          internalNote: "แพ็กเกจพรีเมียม ถอดไพ่ละเอียด",
          status: "completed",
          completedAt: new Date(Date.now() - 3600000 * 2),
          createdBy: owner.id,
        },
        {
          queueNumber: `TQ-${seqDateStr}-0005`,
          queueDate: todayStr,
          queueOrder: 5,
          nickname: "คุณเก้า",
          packageName: "แม่หมอทักเอง — 29 บาท",
          questionCount: 1,
          details: "จะได้เจอเนื้อคู่ภายในปีนี้ไหม",
          internalNote: "ขอยกเลิกเนื่องจากแจ้งข้อมูลซ้ำซ้อน",
          status: "cancelled",
          cancelledAt: new Date(Date.now() - 3600000 * 4),
          createdBy: admin ? admin.id : owner.id,
        },
      ];

      for (const qData of sampleQueues) {
        const q = await prisma.queue.create({ data: qData });

        const rawToken = `demo-${q.queueNumber.toLowerCase()}`;
        await prisma.queueTrackingToken.create({
          data: {
            queueId: q.id,
            token: rawToken,
            tokenHash: hashTrackingToken(rawToken),
            createdBy: q.createdBy,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          actorId: owner.id,
          actorName: owner.displayName,
          action: "SYSTEM_INITIALIZED",
          entityType: "system",
          entityId: "init",
          details: "Initial development demo queues seeded safely",
        },
      });
    }
  }

  console.log("🎉 Seed finished successfully!");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("Seed execution failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  evaluateSeedConfig,
};
