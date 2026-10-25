import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Strictly requires view_audit_logs permission
    const { user } = await requireAuth("view_audit_logs", req);
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
      select: { id: true, queueNumber: true },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "queue",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      queueId: id,
      queueNumber: queue.queueNumber,
      auditLogs,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการดูประวัติระบบ (Audit Log) ของคิวนี้" },
        { status: 403 }
      );
    }
    console.error("Queue audit logs error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดประวัติของคิว" }, { status: 500 });
  }
}
