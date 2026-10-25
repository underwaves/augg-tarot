import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeQueueOrdersForDate } from "@/lib/reorder";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("view_queues");
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, displayName: true, email: true },
        },
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        tokens: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    // Fetch audit history for this specific queue
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "queue",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ queue, auditLogs });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการดูข้อมูลคิวนี้" }, { status: 403 });
    }
    console.error("Get queue detail error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคิว" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("edit_queue");
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.queue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการแก้ไข" }, { status: 404 });
    }

    const {
      nickname,
      queueDate,
      packageName,
      questionCount,
      details,
      internalNote,
      assignedTo,
    } = body;

    const dataToUpdate: any = {};
    if (nickname !== undefined) dataToUpdate.nickname = String(nickname).trim();
    if (packageName !== undefined) dataToUpdate.packageName = String(packageName).trim();
    if (details !== undefined) dataToUpdate.details = details ? String(details).trim() : null;
    if (internalNote !== undefined) dataToUpdate.internalNote = internalNote ? String(internalNote).trim() : null;
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo || null;

    if (questionCount !== undefined) {
      const q = parseInt(String(questionCount), 10);
      if (isNaN(q) || q < 0) {
        return NextResponse.json({ error: "จำนวนคำถามต้องเป็นตัวเลข 0 หรือมากกว่า" }, { status: 400 });
      }
      dataToUpdate.questionCount = q;
    }

    const dateChanged = queueDate && queueDate !== existing.queueDate;
    if (dateChanged) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queueDate)) {
        return NextResponse.json({ error: "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)" }, { status: 400 });
      }
      dataToUpdate.queueDate = queueDate;

      // When date changes, compute order on new date
      const maxOrderRecord = await prisma.queue.findFirst({
        where: {
          queueDate,
          status: { in: ["waiting", "in_progress"] },
        },
        orderBy: { queueOrder: "desc" },
      });
      dataToUpdate.queueOrder = (maxOrderRecord?.queueOrder ?? 0) + 1;
    }

    const updated = await prisma.queue.update({
      where: { id },
      data: dataToUpdate,
    });

    // If date changed, re-normalize old date
    if (dateChanged) {
      await normalizeQueueOrdersForDate(existing.queueDate);
    }

    // Audit log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "UPDATE_QUEUE",
      entityType: "queue",
      entityId: id,
      oldValues: {
        nickname: existing.nickname,
        packageName: existing.packageName,
        questionCount: existing.questionCount,
        queueDate: existing.queueDate,
        details: existing.details,
        internalNote: existing.internalNote,
      },
      newValues: {
        nickname: updated.nickname,
        packageName: updated.packageName,
        questionCount: updated.questionCount,
        queueDate: updated.queueDate,
        details: updated.details,
        internalNote: updated.internalNote,
      },
      details: `แก้ไขข้อมูลคิว ${updated.queueNumber}`,
    });

    return NextResponse.json({ success: true, queue: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการแก้ไขคิว" }, { status: 403 });
    }
    console.error("Update queue error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลคิว" }, { status: 500 });
  }
}
