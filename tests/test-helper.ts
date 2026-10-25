import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Ensure a safe 32+ character JWT secret is available for all tests
process.env.JWT_SECRET = "test_super_secure_random_jwt_secret_key_minimum_32_characters!";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

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

export async function createTestDatabase(name: string) {
  const dbFileName = `test_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.db`;
  const dbPath = path.join(__dirname, dbFileName);

  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

  for (const ddl of DDL_STATEMENTS) {
    await testPrisma.$executeRawUnsafe(ddl);
  }

  const cleanup = async () => {
    try {
      await testPrisma.$disconnect();
    } catch {
      // ignore
    }

    const filesToDelete = [
      dbPath,
      `${dbPath}-journal`,
      `${dbPath}-wal`,
      `${dbPath}-shm`,
    ];

    for (const f of filesToDelete) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // ignore lock on windows
        }
      }
    }
  };

  return {
    prisma: testPrisma,
    dbPath,
    cleanup,
  };
}
