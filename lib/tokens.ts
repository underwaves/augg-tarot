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
 * Creates a new tracking token for a queue, revoking any previously active tokens if desired.
 * Returns the plain raw token for the admin to copy/share with customer.
 */
export async function createQueueTrackingToken(
  queueId: string,
  createdByUserId: string,
  revokePrevious = true
): Promise<{ rawToken: string; trackingUrl: string; tokenId: string }> {
  const rawToken = generateSecureToken();
  const tokenHash = hashTrackingToken(rawToken);

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
        createdBy: createdByUserId,
      },
    });
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const trackingUrl = `${baseUrl}/track/${rawToken}`;

  return {
    rawToken,
    trackingUrl,
    tokenId: trackingRecord.id,
  };
}

/**
 * Revokes a tracking token
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
 * Only returns public safe fields, never internal notes or other customer info.
 */
export async function getQueueByTrackingToken(rawToken: string) {
  if (!rawToken || rawToken.trim() === "") return null;

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
    return { error: "REVOKED" };
  }

  // Check expiration if set
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return { error: "EXPIRED" };
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
    success: true,
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
