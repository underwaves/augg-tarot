import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getBangkokToday, addDaysToDateString } from "@/lib/date";
import { isValidCalendarDate } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("view_queues", req);
    const { searchParams } = new URL(req.url);

    const dateParam = searchParams.get("date");
    if (dateParam !== null && dateParam !== "") {
      if (!isValidCalendarDate(dateParam)) {
        return NextResponse.json(
          { error: "รูปแบบวันที่ไม่ถูกต้องหรือไม่ใช่วันที่มีอยู่จริงในปฏิทิน (ต้องเป็น YYYY-MM-DD)" },
          { status: 400 }
        );
      }
    }

    const date = dateParam || getBangkokToday();

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
    // Using Bangkok civil calendar arithmetic to prevent timezone or DST drift
    const startStr = addDaysToDateString(date, -7);
    const endStr = addDaysToDateString(date, 7);

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

    // Aggregate daily counts for ribbon
    const dailyCounts: Record<string, { total: number; waiting: number; inProgress: number; completed: number; cancelled: number }> = {};
    for (let i = -7; i <= 7; i++) {
      const d = addDaysToDateString(date, i);
      dailyCounts[d] = { total: 0, waiting: 0, inProgress: 0, completed: 0, cancelled: 0 };
    }

    for (const sq of surroundingQueues) {
      if (dailyCounts[sq.queueDate]) {
        dailyCounts[sq.queueDate].total += 1;
        if (sq.status === "waiting") dailyCounts[sq.queueDate].waiting += 1;
        if (sq.status === "in_progress") dailyCounts[sq.queueDate].inProgress += 1;
        if (sq.status === "completed") dailyCounts[sq.queueDate].completed += 1;
        if (sq.status === "cancelled") dailyCounts[sq.queueDate].cancelled += 1;
      }
    }

    return NextResponse.json({
      date,
      summary: {
        total,
        waiting,
        inProgress,
        completed,
        cancelled,
      },
      queues: queuesForDate,
      surroundingCounts: dailyCounts,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการดูข้อมูลปฏิทินคิว" }, { status: 403 });
    }
    console.error("Calendar API error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน" }, { status: 500 });
  }
}
