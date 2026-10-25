import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeQueueOrdersForDate } from "@/lib/reorder";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, note } = body;

    const validStatuses = ["waiting", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }

    // Check permission: if status is cancelled, requires cancel_queue; otherwise change_status
    const requiredPerm = status === "cancelled" ? "cancel_queue" : "change_status";
    const { user } = await requireAuth(requiredPerm);

    const existing = await prisma.queue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการเปลี่ยนสถานะ" }, { status: 404 });
    }

    if (existing.status === status) {
      return NextResponse.json({ success: true, queue: existing });
    }

    const dataToUpdate: any = {
      status,
    };

    if (status === "completed") {
      dataToUpdate.completedAt = new Date();
      dataToUpdate.cancelledAt = null;
    } else if (status === "cancelled") {
      dataToUpdate.cancelledAt = new Date();
      dataToUpdate.completedAt = null;
    } else {
      // Re-activated to waiting or in_progress
      dataToUpdate.completedAt = null;
      dataToUpdate.cancelledAt = null;

      // If was previously completed or cancelled, put at end of active queue
      if (["completed", "cancelled"].includes(existing.status)) {
        const maxOrder = await prisma.queue.findFirst({
          where: {
            queueDate: existing.queueDate,
            status: { in: ["waiting", "in_progress"] },
          },
          orderBy: { queueOrder: "desc" },
        });
        dataToUpdate.queueOrder = (maxOrder?.queueOrder ?? 0) + 1;
      }
    }

    if (note) {
      dataToUpdate.internalNote = existing.internalNote
        ? `${existing.internalNote}\n[${new Date().toLocaleTimeString("th-TH")}] ${note}`
        : note;
    }

    const updated = await prisma.queue.update({
      where: { id },
      data: dataToUpdate,
    });

    // Re-normalize active orders
    await normalizeQueueOrdersForDate(existing.queueDate);

    // Audit Log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "CHANGE_STATUS",
      entityType: "queue",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
      details: `เปลี่ยนสถานะคิว ${existing.queueNumber} จาก "${existing.status}" เป็น "${status}"${note ? ` (หมายเหตุ: ${note})` : ""}`,
    });

    return NextResponse.json({ success: true, queue: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะคิวนี้" }, { status: 403 });
    }
    console.error("Change queue status error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" }, { status: 500 });
  }
}
