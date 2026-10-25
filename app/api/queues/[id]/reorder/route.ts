import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { moveQueueStep, jumpQueueToPosition } from "@/lib/reorder";
import { parseStrictInteger } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("reorder_queue", req);
    const { id } = params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const { type, direction, targetPosition } = body || {};

    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการจัดลำดับ" }, { status: 404 });
    }

    if (!["waiting", "in_progress"].includes(queue.status)) {
      return NextResponse.json(
        { error: "ไม่สามารถจัดลำดับคิวที่เสร็จแล้วหรือยกเลิกแล้วได้" },
        { status: 400 }
      );
    }

    let result: any;
    if (type === "step") {
      if (direction !== "up" && direction !== "down") {
        return NextResponse.json({ error: "ทิศทางการเลื่อนไม่ถูกต้อง (ต้องเป็น up หรือ down)" }, { status: 400 });
      }
      result = await moveQueueStep(id, direction);
    } else if (type === "jump") {
      const parsedPos = parseStrictInteger(targetPosition);
      if (!parsedPos.success || parsedPos.value < 1) {
        return NextResponse.json({ error: "ลำดับเป้าหมายต้องเป็นตัวเลขจำนวนเต็มที่มากกว่าหรือเท่ากับ 1" }, { status: 400 });
      }
      result = await jumpQueueToPosition(id, parsedPos.value);
    } else {
      return NextResponse.json({ error: "รูปแบบคำสั่งจัดลำดับไม่ถูกต้อง (ต้องเป็น step หรือ jump)" }, { status: 400 });
    }

    // Log audit
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "REORDER_QUEUE",
      entityType: "queue",
      entityId: id,
      oldValues: { order: result.oldOrder },
      newValues: { order: result.newOrder },
      details: `จัดลำดับคิว ${queue.queueNumber} จากลำดับที่ ${result.oldOrder} ไปเป็นลำดับที่ ${result.newOrder}`,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการจัดลำดับคิว" }, { status: 403 });
    }
    console.error("Reorder queue error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการจัดลำดับคิว" }, { status: 500 });
  }
}
