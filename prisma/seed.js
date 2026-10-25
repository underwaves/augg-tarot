const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashTrackingToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function main() {
  console.log("🌸 Starting database seeding for Magical Pastel Tarot...");

  // Clean existing data for clean demo
  await prisma.queueTrackingToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.queue.deleteMany({});
  await prisma.adminPermission.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.queueSequence.deleteMany({});

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Owner Account
  const owner = await prisma.profile.create({
    data: {
      email: "owner@magicaltarot.com",
      displayName: "แม่หมออันดา (Shop Owner)",
      passwordHash,
      role: "owner",
      isActive: true,
    },
  });
  console.log("✨ Created Owner:", owner.email);

  // 2. Create Admin Account
  const admin = await prisma.profile.create({
    data: {
      email: "admin@magicaltarot.com",
      displayName: "น้องจันทร์เจ้า (Tarot Assistant)",
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });
  console.log("✨ Created Admin:", admin.email);

  // Admin permissions (all except manage_users and view_audit_logs by default)
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

  // 3. Today's date string YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const seqDateStr = `${yyyy}${mm}${dd}`;

  // Queue sequences setup
  await prisma.queueSequence.create({
    data: {
      sequenceDate: seqDateStr,
      lastNumber: 5,
    },
  });

  const sampleQueues = [
    {
      queueNumber: `TQ-${seqDateStr}-0001`,
      queueDate: todayStr,
      queueOrder: 1,
      nickname: "คุณมินนี่",
      packageName: "เปิดไพ่ความรัก 3 ใบ (เจาะลึกความสัมพันธ์)",
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
      packageName: "เปิดไพ่การงานและการเงิน (Celtic Cross)",
      questionCount: 5,
      details: "กำลังตัดสินใจเปลี่ยนงานใหม่ สัมภาษณ์ผ่านแล้ว 2 ที่",
      internalNote: "นัดส่งผลช่วงบ่าย 14:00 น.",
      status: "waiting",
      createdBy: admin.id,
    },
    {
      queueNumber: `TQ-${seqDateStr}-0003`,
      queueDate: todayStr,
      queueOrder: 3,
      nickname: "คุณน้ำหวาน",
      packageName: "ถาม-ตอบ 3 คำถามเคลียร์ใจ",
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
      packageName: "เปิดไพ่ดูภาพรวมชีวิต 12 เรือนชะตา (Zodiac Wheel)",
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
      packageName: "เช็กดวงความรักคนโสด",
      questionCount: 1,
      details: "จะได้เจอเนื้อคู่ภายในปีนี้ไหม",
      internalNote: "ขอยกเลิกเนื่องจากแจ้งข้อมูลซ้ำซ้อน",
      status: "cancelled",
      cancelledAt: new Date(Date.now() - 3600000 * 4),
      createdBy: admin.id,
    },
  ];

  for (const qData of sampleQueues) {
    const q = await prisma.queue.create({ data: qData });

    // Generate tracking token for each queue
    const rawToken = `demo-${q.queueNumber.toLowerCase()}`;
    await prisma.queueTrackingToken.create({
      data: {
        queueId: q.id,
        tokenHash: hashTrackingToken(rawToken),
        createdBy: q.createdBy,
      },
    });

    console.log(`🔮 Created Queue: ${q.queueNumber} (${q.nickname}) -> Track token: ${rawToken}`);
  }

  // Initial audit log
  await prisma.auditLog.create({
    data: {
      actorId: owner.id,
      actorName: owner.displayName,
      action: "SYSTEM_INITIALIZED",
      entityType: "system",
      entityId: "init",
      details: "Initial system seeding with default owner, admin, and demo queues",
    },
  });

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
