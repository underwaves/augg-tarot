import crypto from "crypto";
import { prisma } from "./prisma";

export function hashTrackingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken(): string {
  // 32 cryptographically secure random bytes -> base64url string (43 chars, highly unguessable)
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Returns the configured TTL in days for tracking tokens.
 * Defaults to null (no expiration) to preserve existing behavior and prevent
 * unintentionally breaking active tokens. Can be configured via TRACKING_TOKEN_TTL_DAYS.
 */
export function getTrackingTokenTtlDays(): number | null {
  const envVal = process.env.TRACKING_TOKEN_TTL_DAYS;
  if (!envVal || envVal.trim() === "") return null;
  const days = parseInt(envVal.trim(), 10);
  if (isNaN(days) || days <= 0) return null;
  return days;
}

/**
 * Creates a new tracking token for a queue, revoking any previously active tokens if desired.
 * Stores both raw token and token hash, and sets expiration if configured.
 */
export async function createQueueTrackingToken(
  queueId: string,
  createdByUserId: string,
  revokePrevious = true,
  customBaseUrl?: string
): Promise<{ rawToken: string; trackingUrl: string; tokenId: string; expiresAt: Date | null }> {
  const rawToken = generateSecureToken();
  const tokenHash = hashTrackingToken(rawToken);

  const ttlDays = getTrackingTokenTtlDays();
  const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000) : null;

  const trackingRecord = await prisma.$transaction(async (tx) => {
    if (revokePrevious) {
      await tx.queueTrackingToken.updateMany({
        where: {
          queueId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return tx.queueTrackingToken.create({
      data: {
        queueId,
        tokenHash,
        token: rawToken,
        createdBy: createdByUserId,
        expiresAt,
      },
    });
  });

  const baseUrl = customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const trackingUrl = `${baseUrl}/track/${rawToken}`;

  return {
    rawToken,
    trackingUrl,
    tokenId: trackingRecord.id,
    expiresAt,
  };
}

/**
 * Retrieves the currently active tracking token for a given queue, if one exists and is not expired.
 */
export async function getActiveTrackingToken(
  queueId: string,
  customBaseUrl?: string
): Promise<{
  rawToken: string | null;
  trackingUrl: string | null;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date | null;
} | null> {
  const now = new Date();
  const activeRecord = await prisma.queueTrackingToken.findFirst({
    where: {
      queueId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeRecord) return null;

  const baseUrl = customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const trackingUrl = activeRecord.token ? `${baseUrl}/track/${activeRecord.token}` : null;

  return {
    rawToken: activeRecord.token,
    trackingUrl,
    tokenId: activeRecord.id,
    createdAt: activeRecord.createdAt,
    expiresAt: activeRecord.expiresAt,
  };
}

/**
 * Revokes all active tracking tokens for a queue.
 */
export async function revokeTrackingToken(queueId: string): Promise<void> {
  await prisma.queueTrackingToken.updateMany({
    where: {
      queueId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

/**
 * Retrieves public queue status info using raw token.
 * Strictly returns only safe public fields. NEVER includes internalNote, details, creator info, or audit logs.
 */
export async function getQueueByTrackingToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim() === "") return null;

  const tokenHash = hashTrackingToken(rawToken.trim());

  const tokenRecord = await prisma.queueTrackingToken.findUnique({
    where: { tokenHash },
    include: {
      queue: true,
    },
  });

  if (!tokenRecord) return null;

  // Check if revoked
  if (tokenRecord.revokedAt) {
    return { error: "REVOKED" as const };
  }

  // Check expiration if set
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return { error: "EXPIRED" as const };
  }

  const q = tokenRecord.queue;

  // Calculate queues ahead of this customer:
  // Count queues with the same queueDate, status in ('waiting', 'in_progress'), and queueOrder < this queue's queueOrder
  let queuesAhead = 0;
  if (q.status === "waiting") {
    queuesAhead = await prisma.queue.count({
      where: {
        queueDate: q.queueDate,
        status: { in: ["waiting", "in_progress"] },
        queueOrder: { lt: q.queueOrder },
      },
    });
  }

  return {
    success: true as const,
    data: {
      queueNumber: q.queueNumber,
      nickname: q.nickname,
      queueDate: q.queueDate,
      packageName: q.packageName,
      questionCount: q.questionCount,
      status: q.status,
      queueOrder: q.queueOrder,
      queuesAhead,
      updatedAt: q.updatedAt.toISOString(),
      completedAt: q.completedAt ? q.completedAt.toISOString() : null,
      cancelledAt: q.cancelledAt ? q.cancelledAt.toISOString() : null,
    },
  };
}
