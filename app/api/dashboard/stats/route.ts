import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const { user } = await requireAuth("view_queues");

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      totalCount,
      waitingCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      todayCount,
      pendingOverdueCount,
      upcomingQueues,
      recentLogs,
    ] = await Promise.all([
      // 1. Total queues
      prisma.queue.count(),
      // 2. Waiting
      prisma.queue.count({ where: { status: "waiting" } }),
      // 3. In Progress
      prisma.queue.count({ where: { status: "in_progress" } }),
      // 4. Completed
      prisma.queue.count({ where: { status: "completed" } }),
      // 5. Cancelled
      prisma.queue.count({ where: { status: "cancelled" } }),
      // 6. Today total
      prisma.queue.count({ where: { queueDate: todayStr } }),
      // 7. Pending / Overdue (queues from today or before that are not done)
      prisma.queue.count({
        where: {
          queueDate: { lte: todayStr },
          status: { in: ["waiting", "in_progress"] },
        },
      }),
      // Upcoming queues (active queues today and future, sorted)
      prisma.queue.findMany({
        where: {
          status: { in: ["waiting", "in_progress"] },
        },
        orderBy: [{ queueDate: "asc" }, { queueOrder: "asc" }],
        take: 8,
        include: {
          creator: { select: { displayName: true } },
          tokens: {
            where: { revokedAt: null },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      // Recent audit logs
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    return NextResponse.json({
      stats: {
        total: totalCount,
        waiting: waitingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        cancelled: cancelledCount,
        today: todayCount,
        pendingOverdue: pendingOverdueCount,
      },
      upcomingQueues,
      recentLogs,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเข้าถึงแดชบอร์ด" }, { status: 403 });
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ" }, { status: 500 });
  }
}
