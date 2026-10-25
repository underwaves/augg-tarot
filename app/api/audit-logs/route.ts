import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { parsePaginationParams } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("view_audit_logs", req);
    const { searchParams } = new URL(req.url);

    const paginationResult = parsePaginationParams(searchParams, 30, 100);
    if ("error" in paginationResult) {
      return NextResponse.json({ error: paginationResult.error }, { status: 400 });
    }
    const { page, limit, skip } = paginationResult;

    const action = searchParams.get("action");

    const where: any = {};
    if (action && action !== "all") {
      where.action = action;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      logs,
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
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการดูประวัติระบบ (Audit Log)" }, { status: 403 });
    }
    console.error("List audit logs error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดประวัติระบบ" }, { status: 500 });
  }
}
