import { prisma } from "./prisma";
import { getBangkokToday } from "./date";

/**
 * Generate atomic unique queue number in format TQ-YYYYMMDD-XXXX
 * Uses queue_sequences table within a transaction to guarantee zero collisions
 * Supports executing inside an existing Prisma transaction client (tx)
 */
export async function generateQueueNumber(
  dateStr?: string,
  externalTx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<string> {
  const cleanDateStr = dateStr || getBangkokToday();
  const sequenceDate = cleanDateStr.replace(/-/g, "");

  const execute = async (tx: any) => {
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
    return `TQ-${sequenceDate}-${paddedNumber}`;
  };

  if (externalTx) {
    return await execute(externalTx);
  }

  return await prisma.$transaction(async (tx) => {
    return await execute(tx);
  });
}
