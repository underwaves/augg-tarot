import { prisma } from "./prisma";

/**
 * Normalizes all active (waiting & in_progress) queues for a date to consecutive orders (1, 2, 3...)
 */
export async function normalizeQueueOrdersForDate(queueDate: string) {
  return await prisma.$transaction(async (tx) => {
    const activeQueues = await tx.queue.findMany({
      where: {
        queueDate,
        status: { in: ["waiting", "in_progress"] },
      },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    });

    for (let i = 0; i < activeQueues.length; i++) {
      const expectedOrder = i + 1;
      if (activeQueues[i].queueOrder !== expectedOrder) {
        await tx.queue.update({
          where: { id: activeQueues[i].id },
          data: { queueOrder: expectedOrder },
        });
      }
    }
  });
}

/**
 * Move a queue up (closer to #1) or down
 */
export async function moveQueueStep(queueId: string, direction: "up" | "down") {
  return await prisma.$transaction(async (tx) => {
    const targetQueue = await tx.queue.findUnique({
      where: { id: queueId },
    });

    if (!targetQueue) {
      throw new Error("QUEUE_NOT_FOUND");
    }

    if (!["waiting", "in_progress"].includes(targetQueue.status)) {
      throw new Error("CANNOT_REORDER_INACTIVE_QUEUE");
    }

    // Get all active queues for the same date sorted by queueOrder
    const activeQueues = await tx.queue.findMany({
      where: {
        queueDate: targetQueue.queueDate,
        status: { in: ["waiting", "in_progress"] },
      },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    });

    const currentIndex = activeQueues.findIndex((q) => q.id === queueId);
    if (currentIndex === -1) {
      throw new Error("QUEUE_NOT_ACTIVE");
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= activeQueues.length) {
      // Already at the top or bottom
      return { success: true, activeQueues };
    }

    // Swap positions in array
    const [moved] = activeQueues.splice(currentIndex, 1);
    activeQueues.splice(targetIndex, 0, moved);

    // Update orders sequentially
    for (let i = 0; i < activeQueues.length; i++) {
      await tx.queue.update({
        where: { id: activeQueues[i].id },
        data: { queueOrder: i + 1 },
      });
    }

    return {
      success: true,
      oldOrder: currentIndex + 1,
      newOrder: targetIndex + 1,
    };
  });
}

/**
 * Jump queue directly to target order (1-based index)
 */
export async function jumpQueueToPosition(queueId: string, targetPosition: number) {
  return await prisma.$transaction(async (tx) => {
    const targetQueue = await tx.queue.findUnique({
      where: { id: queueId },
    });

    if (!targetQueue) {
      throw new Error("QUEUE_NOT_FOUND");
    }

    if (!["waiting", "in_progress"].includes(targetQueue.status)) {
      throw new Error("CANNOT_REORDER_INACTIVE_QUEUE");
    }

    const activeQueues = await tx.queue.findMany({
      where: {
        queueDate: targetQueue.queueDate,
        status: { in: ["waiting", "in_progress"] },
      },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    });

    const currentIndex = activeQueues.findIndex((q) => q.id === queueId);
    if (currentIndex === -1) {
      throw new Error("QUEUE_NOT_ACTIVE");
    }

    // Clamp targetPosition between 1 and activeQueues.length
    const boundedPos = Math.max(1, Math.min(targetPosition, activeQueues.length));
    const targetIndex = boundedPos - 1;

    if (currentIndex === targetIndex) {
      return { success: true, oldOrder: currentIndex + 1, newOrder: boundedPos };
    }

    // Move element
    const [moved] = activeQueues.splice(currentIndex, 1);
    activeQueues.splice(targetIndex, 0, moved);

    // Update orders sequentially
    for (let i = 0; i < activeQueues.length; i++) {
      await tx.queue.update({
        where: { id: activeQueues[i].id },
        data: { queueOrder: i + 1 },
      });
    }

    return {
      success: true,
      oldOrder: currentIndex + 1,
      newOrder: boundedPos,
    };
  });
}
