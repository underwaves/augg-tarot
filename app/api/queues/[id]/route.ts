import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeQueueOrdersForDate } from "@/lib/reorder";
import { updateQueueSchema, formatZodError } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("view_queues", req);
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

    const canViewAudit = user.role === "owner" || user.permissions.includes("view_audit_logs");
    let auditLogs: any[] | undefined = undefined;

    // Requirement: Queue details API must not return auditLogs to users without view_audit_logs
    if (canViewAudit) {
      auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: "queue",
          entityId: id,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    const now = new Date();
    const activeToken = queue.tokens.find(
      (t) => !t.revokedAt && (!t.expiresAt || t.expiresAt > now)
    );
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const activeTrackingUrl = activeToken?.token ? `${baseUrl}/track/${activeToken.token}` : null;

    return NextResponse.json({
      queue: {
        ...queue,
        activeTrackingUrl,
      },
      ...(canViewAudit ? { auditLogs } : {}),
      canViewAuditLogs: canViewAudit,
    });
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
    const { user } = await requireAuth("edit_queue", req);
    const { id } = params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const parseResult = updateQueueSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

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
    } = parseResult.data;

    const dataToUpdate: any = {};
    if (nickname !== undefined) dataToUpdate.nickname = nickname.trim();
    if (packageName !== undefined) dataToUpdate.packageName = packageName.trim();
    if (details !== undefined) dataToUpdate.details = details ? details.trim() : null;
    if (internalNote !== undefined) dataToUpdate.internalNote = internalNote ? internalNote.trim() : null;
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo || null;
    if (questionCount !== undefined) dataToUpdate.questionCount = questionCount;

    const dateChanged = queueDate && queueDate !== existing.queueDate;
    if (dateChanged) {
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
        assignedTo: existing.assignedTo,
      },
      newValues: {
        nickname: updated.nickname,
        packageName: updated.packageName,
        questionCount: updated.questionCount,
        queueDate: updated.queueDate,
        details: updated.details,
        internalNote: updated.internalNote,
        assignedTo: updated.assignedTo,
      },
      details: `แก้ไขข้อมูลคิว ${updated.queueNumber}`,
    });

    return NextResponse.json({ success: true, queue: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลคิวนี้" }, { status: 403 });
    }
    console.error("Update queue error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลคิว" }, { status: 500 });
  }
}
