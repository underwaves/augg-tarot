import test, { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "./test-helper";
import { hashPassword, createSessionToken } from "../lib/auth";
import { PATCH as userPatch } from "../app/api/users/[id]/route";
import { POST as userPost } from "../app/api/users/route";
import { GET as queueGet } from "../app/api/queues/[id]/route";
import { GET as queueAuditGet } from "../app/api/queues/[id]/audit-logs/route";
import { NextRequest } from "next/server";

describe("User Permissions and Audit Log Access Suite", () => {
  let dbContext: Awaited<ReturnType<typeof createTestDatabase>>;
  let ownerId: string;
  let ownerToken: string;
  let adminId: string;
  let adminToken: string;
  let secondAdminId: string;
  let testQueueId: string;

  before(async () => {
    dbContext = await createTestDatabase("perm");
    (global as any).prisma = dbContext.prisma;

    const pwHash = await hashPassword("Password123!");

    // Create Owner
    const owner = await dbContext.prisma.profile.create({
      data: {
        email: "owner@permtest.com",
        displayName: "Owner User",
        passwordHash: pwHash,
        role: "owner",
        isActive: true,
      },
    });
    ownerId = owner.id;
    ownerToken = await createSessionToken(ownerId);

    // Create Admin 1 with manage_users and view_queues (but NOT view_audit_logs)
    const admin = await dbContext.prisma.profile.create({
      data: {
        email: "admin1@permtest.com",
        displayName: "Admin One",
        passwordHash: pwHash,
        role: "admin",
        isActive: true,
      },
    });
    adminId = admin.id;
    await dbContext.prisma.adminPermission.createMany({
      data: [
        { userId: adminId, permissionKey: "manage_users", grantedBy: ownerId },
        { userId: adminId, permissionKey: "view_queues", grantedBy: ownerId },
        { userId: adminId, permissionKey: "create_queue", grantedBy: ownerId },
      ],
    });
    adminToken = await createSessionToken(adminId);

    // Create Admin 2
    const admin2 = await dbContext.prisma.profile.create({
      data: {
        email: "admin2@permtest.com",
        displayName: "Admin Two",
        passwordHash: pwHash,
        role: "admin",
        isActive: true,
      },
    });
    secondAdminId = admin2.id;
    await dbContext.prisma.adminPermission.create({
      data: { userId: secondAdminId, permissionKey: "view_queues", grantedBy: ownerId },
    });

    // Create a sample queue
    const queue = await dbContext.prisma.queue.create({
      data: {
        queueNumber: "TQ-20261025-0001",
        queueDate: "2026-10-25",
        queueOrder: 1,
        nickname: "คุณแอน",
        packageName: "เปิดไพ่ความรัก",
        questionCount: 3,
        status: "waiting",
        createdBy: ownerId,
      },
    });
    testQueueId = queue.id;

    // Create audit log for this queue
    await dbContext.prisma.auditLog.create({
      data: {
        actorId: ownerId,
        actorName: "Owner User",
        action: "CREATE_QUEUE",
        entityType: "queue",
        entityId: testQueueId,
        details: "สร้างคิวทดสอบ",
      },
    });
  });

  after(async () => {
    (global as any).prisma = undefined;
    await dbContext.cleanup();
  });

  function makeRequest(url: string, method: string, token: string, body?: any): NextRequest {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      cookie: `tarot_admin_session=${token}`,
    };
    const init: any = { method, headers };
    if (body) init.body = JSON.stringify(body);
    return new NextRequest(new URL(url, "http://localhost:3000"), init);
  }

  describe("Privilege Escalation Prevention (Requirement 1)", () => {
    it("MUST prevent admin with manage_users from modifying their own permissions", async () => {
      const req = makeRequest(`http://localhost:3000/api/users/${adminId}`, "PATCH", adminToken, {
        permissions: ["view_queues", "manage_users", "view_audit_logs"],
      });
      const res = await userPatch(req, { params: { id: adminId } });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.match(json.error, /ผู้ดูแลระบบไม่สามารถแก้ไขสิทธิ์ของบัญชีตนเองได้/);
    });

    it("MUST prevent admin from changing their own role (e.g. promoting to owner)", async () => {
      const req = makeRequest(`http://localhost:3000/api/users/${adminId}`, "PATCH", adminToken, {
        role: "owner",
      });
      const res = await userPatch(req, { params: { id: adminId } });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.match(json.error, /ผู้ดูแลระบบไม่สามารถเปลี่ยนบทบาทของบัญชีตนเองได้/);
    });

    it("MUST prevent admin from granting high-level permissions (manage_users, view_audit_logs) to others", async () => {
      const req = makeRequest(`http://localhost:3000/api/users/${secondAdminId}`, "PATCH", adminToken, {
        permissions: ["view_queues", "view_audit_logs"], // admin1 does not hold view_audit_logs
      });
      const res = await userPatch(req, { params: { id: secondAdminId } });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.match(json.error, /เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์มอบสิทธิ์ระดับสูง/);
    });

    it("MUST prevent admin from creating a new user with high-level permissions", async () => {
      const req = makeRequest("http://localhost:3000/api/users", "POST", adminToken, {
        email: "sneaky_admin@example.com",
        displayName: "Sneaky Admin",
        password: "ValidPassword123!",
        permissions: ["view_queues", "manage_users"],
      });
      const res = await userPost(req);
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.match(json.error, /เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์มอบสิทธิ์ระดับสูง/);
    });

    it("Owner CAN grant permissions and records audit log with oldValues and newValues", async () => {
      const req = makeRequest(`http://localhost:3000/api/users/${secondAdminId}`, "PATCH", ownerToken, {
        permissions: ["view_queues", "edit_queue"],
      });
      const res = await userPatch(req, { params: { id: secondAdminId } });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);

      // Verify audit log was recorded
      const log = await dbContext.prisma.auditLog.findFirst({
        where: { entityType: "user", entityId: secondAdminId },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(log);
      assert.strictEqual(log.action, "UPDATE_PERMISSIONS");
      assert.ok(log.oldValues, "Audit log must contain oldValues");
      assert.ok(log.newValues, "Audit log must contain newValues");
    });
  });

  describe("Audit Log Access Control (Requirement 2)", () => {
    it("MUST NOT return auditLogs in queue detail API to users without view_audit_logs", async () => {
      // admin1 has view_queues but NOT view_audit_logs
      const req = makeRequest(`http://localhost:3000/api/queues/${testQueueId}`, "GET", adminToken);
      const res = await queueGet(req, { params: { id: testQueueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.ok(json.queue, "Queue details must be returned");
      assert.strictEqual(json.auditLogs, undefined, "auditLogs MUST NOT be returned to user without view_audit_logs");
      assert.strictEqual(json.canViewAuditLogs, false);
    });

    it("Returns auditLogs in queue detail API to owner / users with view_audit_logs", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${testQueueId}`, "GET", ownerToken);
      const res = await queueGet(req, { params: { id: testQueueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(json.auditLogs), "auditLogs must be an array for authorized users");
      assert.strictEqual(json.canViewAuditLogs, true);
    });

    it("Dedicated queue audit-logs endpoint returns 403 Forbidden to unauthorized user", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${testQueueId}/audit-logs`, "GET", adminToken);
      const res = await queueAuditGet(req, { params: { id: testQueueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.match(json.error, /คุณไม่มีสิทธิ์ในการดูประวัติระบบ/);
    });

    it("Dedicated queue audit-logs endpoint returns 200 OK with logs to owner", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${testQueueId}/audit-logs`, "GET", ownerToken);
      const res = await queueAuditGet(req, { params: { id: testQueueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.auditLogs));
      assert.ok(json.auditLogs.length > 0);
    });
  });
});
