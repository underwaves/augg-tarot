import test, { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "./test-helper";
import { hashPassword, createSessionToken } from "../lib/auth";
import { POST as queuesPost, GET as queuesGet } from "../app/api/queues/route";
import { PATCH as queuePatch } from "../app/api/queues/[id]/route";
import { PATCH as queueStatusPatch } from "../app/api/queues/[id]/status/route";
import { POST as queueReorderPost } from "../app/api/queues/[id]/reorder/route";
import { GET as calendarGet } from "../app/api/calendar/route";
import { NextRequest } from "next/server";

describe("API Input Validation & Boundary Testing Suite (Requirement 4)", () => {
  let dbContext: Awaited<ReturnType<typeof createTestDatabase>>;
  let ownerId: string;
  let ownerToken: string;
  let queueId: string;

  before(async () => {
    dbContext = await createTestDatabase("api_val");
    (global as any).prisma = dbContext.prisma;

    const pwHash = await hashPassword("Password123!");
    const owner = await dbContext.prisma.profile.create({
      data: {
        email: "owner@apival.com",
        displayName: "Owner ApiVal",
        passwordHash: pwHash,
        role: "owner",
        isActive: true,
      },
    });
    ownerId = owner.id;
    ownerToken = await createSessionToken(ownerId);

    const q = await dbContext.prisma.queue.create({
      data: {
        queueNumber: "TQ-20261025-0001",
        queueDate: "2026-10-25",
        queueOrder: 1,
        nickname: "คุณแอนดี้",
        packageName: "เปิดไพ่ทั่วไป",
        questionCount: 1,
        status: "waiting",
        createdBy: ownerId,
      },
    });
    queueId = q.id;
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

  describe("POST /api/queues (Create Queue)", () => {
    it("Rejects impossible calendar dates (2099-99-99) with HTTP 400 and Thai message", async () => {
      const req = makeRequest("http://localhost:3000/api/queues", "POST", ownerToken, {
        nickname: "คุณนก",
        queueDate: "2099-99-99",
        packageName: "Basic",
        questionCount: 3,
      });
      const res = await queuesPost(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /รูปแบบวันที่ไม่ถูกต้องหรือไม่ใช่วันที่มีอยู่จริง/);
    });

    it("Rejects non-integer questionCount like '3abc' with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/queues", "POST", ownerToken, {
        nickname: "คุณนก",
        queueDate: "2026-10-25",
        packageName: "Basic",
        questionCount: "3abc",
      });
      const res = await queuesPost(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /ตัวเลขจำนวนเต็ม/);
    });

    it("Rejects negative questionCount with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/queues", "POST", ownerToken, {
        nickname: "คุณนก",
        queueDate: "2026-10-25",
        packageName: "Basic",
        questionCount: -1,
      });
      const res = await queuesPost(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
    });
  });

  describe("GET /api/queues (List Queues Query Validation)", () => {
    it("Rejects invalid date query param with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/queues?date=2099-99-99", "GET", ownerToken);
      const res = await queuesGet(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /รูปแบบวันที่ไม่ถูกต้อง/);
    });

    it("Rejects invalid pagination limit with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/queues?limit=abc", "GET", ownerToken);
      const res = await queuesGet(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /limit/);
    });

    it("Rejects invalid status filter with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/queues?status=hacked", "GET", ownerToken);
      const res = await queuesGet(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /สถานะ.*ไม่ถูกต้อง/);
    });
  });

  describe("PATCH /api/queues/[id] (Update Queue)", () => {
    it("Rejects non-integer questionCount '3abc' with HTTP 400", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${queueId}`, "PATCH", ownerToken, {
        questionCount: "3abc",
      });
      const res = await queuePatch(req, { params: { id: queueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /ตัวเลขจำนวนเต็ม/);
    });

    it("Rejects invalid calendar date '2024-02-30' with HTTP 400", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${queueId}`, "PATCH", ownerToken, {
        queueDate: "2024-02-30",
      });
      const res = await queuePatch(req, { params: { id: queueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /รูปแบบวันที่ไม่ถูกต้อง/);
    });
  });

  describe("POST /api/queues/[id]/status (Change Status)", () => {
    it("Rejects invalid status with HTTP 400", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${queueId}/status`, "PATCH", ownerToken, {
        status: "destroyed",
      });
      const res = await queueStatusPatch(req, { params: { id: queueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /สถานะ 'destroyed' ไม่ถูกต้อง/);
    });
  });

  describe("POST /api/queues/[id]/reorder (Reorder)", () => {
    it("Rejects invalid jump targetPosition '3abc' with HTTP 400", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${queueId}/reorder`, "POST", ownerToken, {
        type: "jump",
        targetPosition: "3abc",
      });
      const res = await queueReorderPost(req, { params: { id: queueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /ลำดับเป้าหมายต้องเป็นตัวเลขจำนวนเต็ม/);
    });

    it("Rejects invalid step direction with HTTP 400", async () => {
      const req = makeRequest(`http://localhost:3000/api/queues/${queueId}/reorder`, "POST", ownerToken, {
        type: "step",
        direction: "sideways",
      });
      const res = await queueReorderPost(req, { params: { id: queueId } });
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /ทิศทางการเลื่อนไม่ถูกต้อง/);
    });
  });

  describe("GET /api/calendar (Calendar Date Validation)", () => {
    it("Rejects impossible calendar date query with HTTP 400", async () => {
      const req = makeRequest("http://localhost:3000/api/calendar?date=2099-99-99", "GET", ownerToken);
      const res = await calendarGet(req);
      const json = await res.json();

      assert.strictEqual(res.status, 400);
      assert.match(json.error, /รูปแบบวันที่ไม่ถูกต้อง/);
    });
  });
});
