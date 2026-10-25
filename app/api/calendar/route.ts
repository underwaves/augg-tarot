import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("view_queues");
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Fetch all queues for this specific date
    const queuesForDate = await prisma.queue.findMany({
      where: { queueDate: date },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
      include: {
        creator: { select: { displayName: true } },
        tokens: {
          where: { revokedAt: null },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Summary counts for this date
    const total = queuesForDate.length;
    const waiting = queuesForDate.filter((q) => q.status === "waiting").length;
    const inProgress = queuesForDate.filter((q) => q.status === "in_progress").length;
    const completed = queuesForDate.filter((q) => q.status === "completed").length;
    const cancelled = queuesForDate.filter((q) => q.status === "cancelled").length;

    // Get counts for surrounding 14 days (7 days before, 7 days after) for the mini date picker ribbon
    const curr = new Date(date);
    const startDate = new Date(curr);
    startDate.setDate(curr.getDate() - 7);
    const endDate = new Date(curr);
    endDate.setDate(curr.getDate() + 7);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const surroundingQueues = await prisma.queue.findMany({
      where: {
        queueDate: {
          gte: startStr,
          lte: endStr,
        },
      },
      select: {
        queueDate: true,
        status: true,
      },
    });

    // Group counts by date
    const dailyCounts: Record<string, { total: number; pending: number }> = {};
    for (const q of surroundingQueues) {
      if (!dailyCounts[q.queueDate]) {
        dailyCounts[q.queueDate] = { total: 0, pending: 0 };
      }
      dailyCounts[q.queueDate].total += 1;
      if (["waiting", "in_progress"].includes(q.status)) {
        dailyCounts[q.queueDate].pending += 1;
      }
    }

    return NextResponse.json({
      selectedDate: date,
      summary: {
        total,
        waiting,
        inProgress,
        completed,
        cancelled,
      },
      queues: queuesForDate,
      dailyCounts,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเข้าถึงปฏิทินคิว" }, { status: 403 });
    }
    console.error("Calendar error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน" }, { status: 500 });
  }
}
