import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateQueueNumber } from "@/lib/queue-sequence";
import { createQueueTrackingToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";
import { getBangkokToday } from "@/lib/date";
import {
  createQueueSchema,
  isValidCalendarDate,
  parsePaginationParams,
  formatZodError,
} from "@/lib/validation";

const VALID_STATUSES = ["all", "pending", "waiting", "in_progress", "completed", "cancelled"] as const;

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("view_queues", req);
    const { searchParams } = new URL(req.url);

    // Validate pagination params strictly
    const paginationResult = parsePaginationParams(searchParams, 20, 100);
    if ("error" in paginationResult) {
      return NextResponse.json({ error: paginationResult.error }, { status: 400 });
    }
    const { page, limit, skip } = paginationResult;

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const date = searchParams.get("date") || "all";
    const isHistory = searchParams.get("isHistory") === "true";

    // Validate status parameter
    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { error: `ค่าสถานะ '${status}' ไม่ถูกต้อง สถานะที่อนุญาต: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate date parameter
    if (date !== "all" && date !== "today") {
      if (!isValidCalendarDate(date)) {
        return NextResponse.json(
          { error: "รูปแบบวันที่ไม่ถูกต้องหรือไม่ใช่วันที่มีอยู่จริงในปฏิทิน (ต้องเป็น YYYY-MM-DD)" },
          { status: 400 }
        );
      }
    }

    const todayStr = getBangkokToday();

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
    let orderBy: any[] = [{ queueDate: "asc" }, { queueOrder: "asc" }, { createdAt: "asc" }];
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

/**
 * Creates a queue transactionally with retry logic to guarantee
 * unique sequential queueOrder and queueNumber even under high concurrency.
 */
async function createQueueWithRetry(
  data: {
    nickname: string;
    queueDate: string;
    packageName: string;
    parsedQuestions: number;
    details: string | null;
    internalNote: string | null;
    status: string;
    userId: string;
  },
  maxRetries = 5
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Generate atomic queue number (format: TQ-YYYYMMDD-XXXX) within tx
          const queueNumber = await generateQueueNumber(data.queueDate, tx);

          // 2. Determine highest active queue order for this date within tx
          const maxOrderRecord = await tx.queue.findFirst({
            where: {
              queueDate: data.queueDate,
              status: { in: ["waiting", "in_progress"] },
            },
            orderBy: { queueOrder: "desc" },
          });

          const queueOrder = (maxOrderRecord?.queueOrder ?? 0) + 1;

          // 3. Create Queue record within tx
          const newQueue = await tx.queue.create({
            data: {
              queueNumber,
              queueDate: data.queueDate,
              queueOrder,
              nickname: data.nickname,
              packageName: data.packageName,
              questionCount: data.parsedQuestions,
              details: data.details,
              internalNote: data.internalNote,
              status: data.status,
              createdBy: data.userId,
            },
          });

          return newQueue;
        },
        {
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (err: any) {
      const isRetryable =
        err?.code === "P2034" || // Prisma transaction conflict / deadlock
        err?.code === "P2028" || // Transaction API error
        err?.code === "P2002" || // Unique constraint race
        (typeof err?.message === "string" &&
          (err.message.includes("database is locked") ||
            err.message.includes("busy") ||
            err.message.includes("conflict") ||
            err.message.includes("deadlock")));

      if (isRetryable && attempt < maxRetries) {
        // Backoff with random jitter (40ms - 150ms)
        const delay = Math.floor(Math.random() * 40) + attempt * 40;
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to create queue after maximum retry attempts");
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth("create_queue", req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const parseResult = createQueueSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const {
      nickname,
      queueDate,
      packageName,
      questionCount,
      details,
      internalNote,
      initialStatus = "waiting",
    } = parseResult.data;

    // Create queue inside atomic transaction with retry logic
    const newQueue = await createQueueWithRetry({
      nickname: nickname.trim(),
      queueDate,
      packageName: packageName.trim(),
      parsedQuestions: questionCount,
      details: details || null,
      internalNote: internalNote || null,
      status: initialStatus,
      userId: user.id,
    });

    // Create initial tracking token
    const tokenInfo = await createQueueTrackingToken(newQueue.id, user.id);

    // Audit Log
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
        questionCount: newQueue.questionCount,
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
