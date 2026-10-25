import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateQueueNumber } from "@/lib/queue-sequence";
import { createQueueTrackingToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("view_queues");
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const date = searchParams.get("date") || "all";
    const isHistory = searchParams.get("isHistory") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const todayStr = new Date().toISOString().split("T")[0];

    // Build where filter
    const where: any = {};

    if (search) {
      where.OR = [
        { queueNumber: { contains: search } },
        { nickname: { contains: search } },
        { packageName: { contains: search } },
      ];
    }

    if (isHistory) {
      where.status = { in: ["completed", "cancelled"] };
    } else if (status !== "all") {
      if (status === "pending") {
        where.status = { in: ["waiting", "in_progress"] };
      } else {
        where.status = status;
      }
    }

    if (date !== "all") {
      if (date === "today") {
        where.queueDate = todayStr;
      } else {
        where.queueDate = date;
      }
    }

    // Sorting
    let orderBy: any[] = [{ queueDate: "asc" }, { queueOrder: "asc" }];
    if (isHistory) {
      orderBy = [{ updatedAt: "desc" }];
    }

    const [total, queues] = await Promise.all([
      prisma.queue.count({ where }),
      prisma.queue.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, displayName: true, email: true },
          },
          tokens: {
            where: { revokedAt: null },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    ]);

    return NextResponse.json({
      queues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการดูรายการคิว" }, { status: 403 });
    }
    console.error("List queues error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคิว" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth("create_queue");
    const body = await req.json();

    const {
      nickname,
      queueDate,
      packageName,
      questionCount,
      details,
      internalNote,
      initialStatus = "waiting",
    } = body;

    // Validation
    if (!nickname || typeof nickname !== "string" || nickname.trim() === "") {
      return NextResponse.json({ error: "กรุณากรอกชื่อเล่นลูกค้า" }, { status: 400 });
    }

    if (!queueDate || !/^\d{4}-\d{2}-\d{2}$/.test(queueDate)) {
      return NextResponse.json({ error: "กรุณาระบุวันที่รับคิวในรูปแบบ YYYY-MM-DD" }, { status: 400 });
    }

    if (!packageName || typeof packageName !== "string" || packageName.trim() === "") {
      return NextResponse.json({ error: "กรุณาระบุชื่อแพ็กเกจ" }, { status: 400 });
    }

    const parsedQuestions = parseInt(String(questionCount), 10);
    if (isNaN(parsedQuestions) || parsedQuestions < 0) {
      return NextResponse.json({ error: "จำนวนคำถามต้องเป็นตัวเลข 0 หรือมากกว่า" }, { status: 400 });
    }

    const validStatuses = ["waiting", "in_progress"];
    const status = validStatuses.includes(initialStatus) ? initialStatus : "waiting";

    // 1. Generate atomic queue number (format: TQ-YYYYMMDD-XXXX)
    const queueNumber = await generateQueueNumber(queueDate);

    // 2. Determine order index for this date
    const maxOrderRecord = await prisma.queue.findFirst({
      where: {
        queueDate,
        status: { in: ["waiting", "in_progress"] },
      },
      orderBy: { queueOrder: "desc" },
    });

    const queueOrder = (maxOrderRecord?.queueOrder ?? 0) + 1;

    // 3. Create Queue
    const newQueue = await prisma.queue.create({
      data: {
        queueNumber,
        queueDate,
        queueOrder,
        nickname: nickname.trim(),
        packageName: packageName.trim(),
        questionCount: parsedQuestions,
        details: details?.trim() || null,
        internalNote: internalNote?.trim() || null,
        status,
        createdBy: user.id,
      },
    });

    // 4. Create initial tracking token
    const tokenInfo = await createQueueTrackingToken(newQueue.id, user.id);

    // 5. Audit Log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "CREATE_QUEUE",
      entityType: "queue",
      entityId: newQueue.id,
      newValues: {
        queueNumber: newQueue.queueNumber,
        nickname: newQueue.nickname,
        queueDate: newQueue.queueDate,
        packageName: newQueue.packageName,
        status: newQueue.status,
      },
      details: `เพิ่มคิวใหม่ ${newQueue.queueNumber} สำหรับ ${newQueue.nickname}`,
    });

    return NextResponse.json({
      success: true,
      queue: newQueue,
      trackingUrl: tokenInfo.trackingUrl,
      rawToken: tokenInfo.rawToken,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเพิ่มคิว" }, { status: 403 });
    }
    console.error("Create queue error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างคิว" }, { status: 500 });
  }
}
