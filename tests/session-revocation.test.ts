import test, { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "./test-helper";
import {
  hashPassword,
  createSessionToken,
  verifySessionToken,
  getCurrentUser,
  revokeSession,
  revokeAllUserSessions,
} from "../lib/auth";

describe("Session Revocation and Token Replay Prevention Suite", () => {
  let dbContext: Awaited<ReturnType<typeof createTestDatabase>>;
  let userId: string;

  before(async () => {
    dbContext = await createTestDatabase("session");
    // Intercept global.prisma so all lib/auth calls operate on the isolated test db
    (global as any).prisma = dbContext.prisma;

    const pwHash = await hashPassword("ValidPassword123!");
    const user = await dbContext.prisma.profile.create({
      data: {
        email: "session_tester@example.com",
        displayName: "Session Tester",
        passwordHash: pwHash,
        role: "admin",
        isActive: true,
      },
    });
    userId = user.id;
  });

  after(async () => {
    (global as any).prisma = undefined;
    await dbContext.cleanup();
  });

  it("should create valid session and authenticate successfully", async () => {
    const token = await createSessionToken(userId);
    const verified = await verifySessionToken(token);
    assert.strictEqual(verified?.sub, userId);
    assert.ok(verified?.sid, "Token must contain sid (Session ID)");

    const currentUser = await getCurrentUser(token);
    assert.ok(currentUser);
    assert.strictEqual(currentUser.id, userId);
    assert.strictEqual(currentUser.email, "session_tester@example.com");
  });

  it("MUST prevent token replay after user logs out", async () => {
    const token = await createSessionToken(userId);
    const verified = await verifySessionToken(token);
    assert.ok(verified?.sid);

    // Initial check: token works
    const beforeLogout = await getCurrentUser(token);
    assert.ok(beforeLogout);

    // User logs out -> session revoked
    await revokeSession(verified.sid);

    // Attacker replays old cookie / token after logout
    const replayed = await getCurrentUser(token);
    assert.strictEqual(replayed, null, "Replayed token after logout MUST be rejected");
  });

  it("MUST prevent token replay after password change or reset", async () => {
    const token = await createSessionToken(userId);

    // User is active and session is valid
    const userBefore = await getCurrentUser(token);
    assert.ok(userBefore);

    // Password changed / reset -> revoke all active user sessions
    const newHash = await hashPassword("BrandNewPassword456!");
    await dbContext.prisma.profile.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    await revokeAllUserSessions(userId);

    // Attacker replays previous token
    const replayed = await getCurrentUser(token);
    assert.strictEqual(replayed, null, "Replayed token after password change MUST be rejected");
  });

  it("MUST prevent token replay after account deactivation", async () => {
    const token = await createSessionToken(userId);

    const userBefore = await getCurrentUser(token);
    assert.ok(userBefore);

    // Account is deactivated
    await dbContext.prisma.profile.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await revokeAllUserSessions(userId);

    // Attacker or former employee replays token
    const replayed = await getCurrentUser(token);
    assert.strictEqual(replayed, null, "Replayed token for deactivated account MUST be rejected");
  });
});
