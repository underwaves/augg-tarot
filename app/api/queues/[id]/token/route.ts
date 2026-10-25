import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createQueueTrackingToken, revokeTrackingToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("create_tracking_token");
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    const { trackingUrl, rawToken, tokenId } = await createQueueTrackingToken(id, user.id);

    // Audit log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "CREATE_TRACKING_TOKEN",
      entityType: "token",
      entityId: tokenId,
      details: `สร้างลิงก์ติดตามคิวสำหรับคิว ${queue.queueNumber}`,
    });

    return NextResponse.json({
      success: true,
      trackingUrl,
      rawToken,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการสร้างลิงก์ติดตามคิว" }, { status: 403 });
    }
    console.error("Create tracking token error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างลิงก์ติดตามคิว" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("create_tracking_token");
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    await revokeTrackingToken(id);

    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "REVOKE_TRACKING_TOKEN",
      entityType: "token",
      entityId: id,
      details: `เพิกถอนลิงก์ติดตามคิวทั้งหมดของคิว ${queue.queueNumber}`,
    });

    return NextResponse.json({ success: true, message: "เพิกถอนลิงก์ติดตามคิวเรียบร้อยแล้ว" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเพิกถอนลิงก์ติดตามคิว" }, { status: 403 });
    }
    console.error("Revoke tracking token error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเพิกถอนลิงก์ติดตามคิว" }, { status: 500 });
  }
}
