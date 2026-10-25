import { prisma } from "./prisma";

/**
 * Generate atomic unique queue number in format TQ-YYYYMMDD-XXXX
 * Uses queue_sequences table within a transaction to guarantee zero collisions
 */
export async function generateQueueNumber(dateStr?: string): Promise<string> {
  // Use today's date in YYYYMMDD format (e.g. 20261025)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const sequenceDate = dateStr ? dateStr.replace(/-/g, "") : `${year}${month}${day}`;

  // Execute in an atomic transaction
  return await prisma.$transaction(async (tx) => {
    // Upsert or increment
    const existing = await tx.queueSequence.findUnique({
      where: { sequenceDate },
    });

    let nextNumber = 1;
    if (existing) {
      nextNumber = existing.lastNumber + 1;
      await tx.queueSequence.update({
        where: { sequenceDate },
        data: { lastNumber: nextNumber },
      });
    } else {
      await tx.queueSequence.create({
        data: {
          sequenceDate,
          lastNumber: 1,
        },
      });
    }

    const paddedNumber = String(nextNumber).padStart(4, "0");
    const queueNumber = `TQ-${sequenceDate}-${paddedNumber}`;

    return queueNumber;
  });
}
