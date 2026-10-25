const puppeteer = require("puppeteer-core");
const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEST_DB_PATH = path.resolve(__dirname, "../prisma/test_ui_viewport.db");
const TEST_DB_URL = "file:./test_ui_viewport.db";

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "admin_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "admin_permissions_userId_permissionKey_key" ON "admin_permissions"("userId", "permissionKey")`,
  `CREATE TABLE IF NOT EXISTS "queues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueNumber" TEXT NOT NULL UNIQUE,
    "queueDate" TEXT NOT NULL,
    "queueOrder" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 1,
    "details" TEXT,
    "internalNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "archivedAt" DATETIME,
    CONSTRAINT "queues_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "queues_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "queue_tracking_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "token" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "queue_tracking_tokens_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "queue_sequences" (
    "sequenceDate" TEXT NOT NULL PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
  )`,
];

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      http
        .get(url, (res) => {
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeout) {
            reject(new Error("Timeout waiting for Next.js test server"));
          } else {
            setTimeout(ping, 500);
          }
        });
    }
    ping();
  });
}

async function cleanUpTestDb() {
  const filesToDelete = [
    TEST_DB_PATH,
    `${TEST_DB_PATH}-journal`,
    `${TEST_DB_PATH}-wal`,
    `${TEST_DB_PATH}-shm`,
  ];
  for (let attempt = 0; attempt < 5; attempt++) {
    let allDeleted = true;
    for (const f of filesToDelete) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (e) {
          allDeleted = false;
        }
      }
    }
    if (allDeleted) break;
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function runUiTests() {
  console.log("🧹 Setting up isolated temporary test database for UI tests...");
  await cleanUpTestDb();

  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  console.log("📦 Applying schema DDL to isolated test DB...");
  for (const ddl of DDL_STATEMENTS) {
    await prisma.$executeRawUnsafe(ddl);
  }

  console.log("🌱 Seeding test accounts and sample queues...");
  const ownerPw = await bcrypt.hash("Password123!", 10);
  const owner = await prisma.profile.create({
    data: {
      email: "owner@magicaltarot.com",
      displayName: "แม่หมออันดา (Shop Owner)",
      passwordHash: ownerPw,
      role: "owner",
      isActive: true,
    },
  });

  const adminPw = await bcrypt.hash("Password123!", 10);
  const admin = await prisma.profile.create({
    data: {
      email: "admin@magicaltarot.com",
      displayName: "น้องจันทร์เจ้า (Tarot Assistant)",
      passwordHash: adminPw,
      role: "admin",
      isActive: true,
    },
  });

  const permissions = [
    "view_queues",
    "create_queue",
    "edit_queue",
    "change_status",
    "reorder_queue",
    "cancel_queue",
    "view_history",
    "create_tracking_token",
    "view_audit_logs",
  ];
  for (const perm of permissions) {
    await prisma.adminPermission.create({
      data: {
        userId: admin.id,
        permissionKey: perm,
        grantedBy: owner.id,
      },
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const testQueue = await prisma.queue.create({
    data: {
      queueNumber: "TQ-20261025-0001",
      queueDate: todayStr,
      queueOrder: 1,
      nickname: "คุณมินนี่",
      packageName: "เปิดไพ่ความรัก 3 ใบ",
      questionCount: 3,
      details: "ต้องการดูแนวโน้มความสัมพันธ์",
      internalNote: "ลูกค้าประจำ โอนผ่านพร้อมเพย์",
      status: "in_progress",
      createdBy: owner.id,
      assignedTo: admin.id,
    },
  });

  const rawToken = "demo-tq-20261025-0001";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.queueTrackingToken.create({
    data: {
      queueId: testQueue.id,
      tokenHash,
      token: rawToken,
      createdBy: owner.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: owner.id,
      actorName: owner.displayName,
      action: "create",
      entityType: "queue",
      entityId: testQueue.id,
      details: "สร้างคิวทดสอบ",
    },
  });

  const queueId = testQueue.id;
  await prisma.$disconnect();

  console.log(`📋 Created test queue ID: ${queueId}, Tracking Token: ${rawToken}`);

  const envOverrides = {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
  };

  console.log(`🚀 Starting Next.js production server on port ${TEST_PORT} with isolated DB...`);
  const serverProc = spawn("npx.cmd", ["next", "start", "-p", String(TEST_PORT)], {
    env: envOverrides,
    stdio: "inherit",
    shell: true,
  });

  let browser;

  try {
    await waitForServer(`${BASE_URL}/login`);
    console.log("✅ Next.js test server is ready on port", TEST_PORT);

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const consoleErrors = [];

    page.on("response", (res) => {
      if (res.status() === 404) {
        console.log(`[404 Response] ${res.url()}`);
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[${page.url()}] ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`[${page.url()}] ${err.message}`);
    });

    const viewports = [
      { name: "Desktop", width: 1280, height: 800 },
      { name: "Mobile", width: 375, height: 667 },
    ];

    // 1. Test Login Page (Unauthenticated)
    for (const vp of viewports) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      console.log(`[${vp.name}] /login - Horizontal overflow: ${hasHorizontalScroll ? "❌ YES" : "✅ NO"}`);
      if (hasHorizontalScroll) {
        throw new Error(`Horizontal overflow detected on ${vp.name} /login`);
      }
    }

    // 2. Perform Login to acquire session cookie
    console.log("🔑 Logging in as owner to test protected admin pages...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "owner@magicaltarot.com");
    await page.type('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("✅ Logged in successfully. Current URL:", page.url());

    const pagesToTest = [
      "/admin/dashboard",
      "/admin/queues",
      "/admin/queues/new",
      "/admin/calendar",
      "/admin/history",
      "/admin/users",
      "/admin/logs",
      `/admin/queues/${queueId}`,
    ];

    for (const path of pagesToTest) {
      for (const vp of viewports) {
        await page.setViewport(vp);
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2" });

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        console.log(`[${vp.name}] ${path} - Horizontal overflow: ${hasHorizontalScroll ? "❌ YES" : "✅ NO"}`);
        if (hasHorizontalScroll) {
          throw new Error(`Horizontal overflow detected on ${vp.name} ${path}`);
        }
      }
    }

    // 3. Test customer tracking page
    for (const vp of viewports) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/track/${rawToken}`, { waitUntil: "networkidle2" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      console.log(`[${vp.name}] /track/... - Horizontal overflow: ${hasHorizontalScroll ? "❌ YES" : "✅ NO"}`);
      if (hasHorizontalScroll) {
        throw new Error(`Horizontal overflow detected on ${vp.name} /track/...`);
      }
    }

    console.log("\n--- JavaScript Error Check ---");
    if (consoleErrors.length > 0) {
      console.warn("⚠️ Console errors detected:", consoleErrors);
      const severeErrors = consoleErrors.filter((e) => !e.includes("favicon"));
      if (severeErrors.length > 0) {
        throw new Error(`Severe JavaScript errors detected on client: ${severeErrors.join("; ")}`);
      }
    } else {
      console.log("✅ No JavaScript errors or unhandled exceptions detected across all tested routes!");
    }

    console.log("\n🎉 ALL UI & RESPONSIVE VIEWPORT TESTS PASSED SUCCESSFULLY!");
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    serverProc.kill("SIGTERM");
    try {
      execSync(`taskkill /pid ${serverProc.pid} /f /t`, { stdio: "ignore" });
    } catch {}

    // Give process a moment to release file lock on test db
    await new Promise((r) => setTimeout(r, 1000));
    await cleanUpTestDb();
    console.log("🧹 Cleaned up temporary test database.");
  }
}

runUiTests().catch(async (err) => {
  console.error("❌ UI Test Failed:", err);
  await cleanUpTestDb();
  process.exit(1);
});
