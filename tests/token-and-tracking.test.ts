import test, { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "./test-helper";
import { hashPassword, createSessionToken } from "../lib/auth";
import { createQueueTrackingToken, hashTrackingToken } from "../lib/tokens";
import { GET as trackGet } from "../app/api/track/[token]/route";
import { GET as queueTokenGet, POST as queueTokenPost } from "../app/api/queues/[id]/token/route";
import { NextRequest } from "next/server";

describe("Token and Public Tracking Suite (Requirement 5)", () => {
  let dbContext: Awaited<ReturnType<typeof createTestDatabase>>;
  let ownerId: string;
  let ownerToken: string;
  let queueId: string;
  let rawActiveToken: string;

  before(async () => {
    dbContext = await createTestDatabase("tracking");
    (global as any).prisma = dbContext.prisma;

    const pwHash = await hashPassword("Password123!");
    const owner = await dbContext.prisma.profile.create({
      data: {
        email: "owner@tracktest.com",
        displayName: "Owner Track",
        passwordHash: pwHash,
        role: "owner",
        isActive: true,
      },
    });
    ownerId = owner.id;
    ownerToken = await createSessionToken(ownerId);

    const queue = await dbContext.prisma.queue.create({
      data: {
        queueNumber: "TQ-20261025-0099",
        queueDate: "2026-10-25",
        queueOrder: 1,
        nickname: "คุณลูกพีช",
        packageName: "เปิดไพ่ 12 ราศี",
        questionCount: 1,
        details: "Secret customer query details",
        internalNote: "VIP TOP SECRET: DO NOT LEAK THIS NOTE",
        status: "waiting",
        createdBy: ownerId,
      },
    });
    queueId = queue.id;

    // Create an initial active tracking token
    const tokenInfo = await createQueueTrackingToken(queueId, ownerId);
    rawActiveToken = tokenInfo.rawToken;
  });

  after(async () => {
    (global as any).prisma = undefined;
    await dbContext.cleanup();
  });

  function makeRequest(url: string, method: string, token?: string): NextRequest {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers.cookie = `tarot_admin_session=${token}`;
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), { method, headers });
  }

  it("Active tracking token returns public info with Cache-Control: no-store and NO internalNote", async () => {
    const req = makeRequest(`http://localhost:3000/api/track/${rawActiveToken}`, "GET");
    const res = await trackGet(req, { params: { token: rawActiveToken } });
    const json = await res.json();

    assert.strictEqual(res.status, 200);

    // Verify Cache-Control header
    const cacheControl = res.headers.get("cache-control");
    assert.ok(cacheControl, "Cache-Control header must be present");
    assert.match(cacheControl, /no-store/);

    // Verify public info returned
    assert.strictEqual(json.queueNumber, "TQ-20261025-0099");
    assert.strictEqual(json.nickname, "คุณลูกพีช");
    assert.strictEqual(json.packageName, "เปิดไพ่ 12 ราศี");
    assert.strictEqual(json.status, "waiting");

    // CRITICAL SECURITY ASSERTION: Internal note and sensitive details must NEVER be leaked
    assert.strictEqual(json.internalNote, undefined, "internalNote MUST NOT be exposed in tracking API");
    assert.strictEqual(json.details, undefined, "internal details MUST NOT be exposed in tracking API");
    assert.strictEqual(JSON.stringify(json).includes("VIP TOP SECRET"), false);
  });

  it("Revoked tracking token returns HTTP 410 with Cache-Control: no-store", async () => {
    // Revoke the token
    const tokenHash = hashTrackingToken(rawActiveToken);
    await dbContext.prisma.queueTrackingToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    const req = makeRequest(`http://localhost:3000/api/track/${rawActiveToken}`, "GET");
    const res = await trackGet(req, { params: { token: rawActiveToken } });
    const json = await res.json();

    assert.strictEqual(res.status, 410);
    assert.match(json.error, /เพิกถอน/);

    const cacheControl = res.headers.get("cache-control");
    assert.match(cacheControl || "", /no-store/);
  });

  it("Expired tracking token returns HTTP 410 with Cache-Control: no-store", async () => {
    // Create an expired token record
    const expiredRawToken = "expired-token-1234567890abcdef";
    const expiredHash = hashTrackingToken(expiredRawToken);
    await dbContext.prisma.queueTrackingToken.create({
      data: {
        queueId,
        token: expiredRawToken,
        tokenHash: expiredHash,
        createdBy: ownerId,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    const req = makeRequest(`http://localhost:3000/api/track/${expiredRawToken}`, "GET");
    const res = await trackGet(req, { params: { token: expiredRawToken } });
    const json = await res.json();

    assert.strictEqual(res.status, 410);
    assert.match(json.error, /หมดอายุ/);

    const cacheControl = res.headers.get("cache-control");
    assert.match(cacheControl || "", /no-store/);
  });

  it("Copying/Retrieving token does NOT create a new token or invalidate existing link", async () => {
    // Generate a fresh active token
    const freshTokenInfo = await createQueueTrackingToken(queueId, ownerId, true);
    const initialRawToken = freshTokenInfo.rawToken;
    const initialTokenId = freshTokenInfo.tokenId;

    // Simulate reading active token (e.g. for Copy button)
    const req1 = makeRequest(`http://localhost:3000/api/queues/${queueId}/token`, "GET", ownerToken);
    const res1 = await queueTokenGet(req1, { params: { id: queueId } });
    const json1 = await res1.json();

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(json1.hasActiveToken, true);
    assert.strictEqual(json1.activeToken.tokenId, initialTokenId);
    assert.strictEqual(json1.activeToken.rawToken, initialRawToken);

    // Verify original token is STILL active and valid
    const trackReq = makeRequest(`http://localhost:3000/api/track/${initialRawToken}`, "GET");
    const trackRes = await trackGet(trackReq, { params: { token: initialRawToken } });
    assert.strictEqual(trackRes.status, 200, "Token MUST still be valid after copying");
  });

  it("Regenerating token explicitly issues new token and revokes previous token", async () => {
    // Current active token
    const activeBefore = await dbContext.prisma.queueTrackingToken.findFirst({
      where: { queueId, revokedAt: null },
    });
    assert.ok(activeBefore);

    // Explicit regenerate action (POST /api/queues/[id]/token)
    const req = makeRequest(`http://localhost:3000/api/queues/${queueId}/token`, "POST", ownerToken);
    const res = await queueTokenPost(req, { params: { id: queueId } });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.rawToken);
    assert.notStrictEqual(json.rawToken, activeBefore.token);

    // Verify previous token is now revoked in database
    const oldTokenInDb = await dbContext.prisma.queueTrackingToken.findUnique({
      where: { id: activeBefore.id },
    });
    assert.ok(oldTokenInDb?.revokedAt, "Old token must be marked as revoked");

    // Old token must return 410
    if (activeBefore.token) {
      const oldReq = makeRequest(`http://localhost:3000/api/track/${activeBefore.token}`, "GET");
      const oldRes = await trackGet(oldReq, { params: { token: activeBefore.token } });
      assert.strictEqual(oldRes.status, 410);
    }
  });
});
