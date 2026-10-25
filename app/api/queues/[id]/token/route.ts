import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createQueueTrackingToken, revokeTrackingToken, getActiveTrackingToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("view_queues", req);
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
      select: { id: true, queueNumber: true },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const activeTokenInfo = await getActiveTrackingToken(id, baseUrl);

    return NextResponse.json({
      success: true,
      hasActiveToken: Boolean(activeTokenInfo),
      activeToken: activeTokenInfo,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการดูข้อมูลคิวนี้" }, { status: 403 });
    }
    console.error("Get tracking token error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลลิงก์ติดตามคิว" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("create_tracking_token", req);
    const { id } = params;

    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      return NextResponse.json({ error: "ไม่พบคิวที่ต้องการ" }, { status: 404 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const { trackingUrl, rawToken, tokenId, expiresAt } = await createQueueTrackingToken(id, user.id, true, baseUrl);

    // Audit log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "CREATE_TRACKING_TOKEN",
      entityType: "token",
      entityId: tokenId,
      details: `ออกลิงก์ติดตามคิวใหม่สำหรับคิว ${queue.queueNumber} (เพิกถอนลิงก์เดิมเรียบร้อยแล้ว)`,
    });

    return NextResponse.json({
      success: true,
      trackingUrl,
      rawToken,
      expiresAt,
      message: "สร้างลิงก์ติดตามคิวใหม่เรียบร้อยแล้ว ลิงก์เดิมถูกเพิกถอน",
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
    const { user } = await requireAuth("create_tracking_token", req);
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
