import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PERMISSION_KEYS, PermissionKey } from "@/lib/types";
import { createUserSchema, formatZodError } from "@/lib/validation";

const HIGH_LEVEL_PERMISSIONS: PermissionKey[] = ["manage_users", "view_audit_logs"];

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth("manage_users", req);

    const users = await prisma.profile.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permissionKey: true,
          },
        },
      },
    });

    const formatted = users.map((u) => ({
      ...u,
      permissions: u.role === "owner" ? [...PERMISSION_KEYS] : u.permissions.map((p) => p.permissionKey),
    }));

    return NextResponse.json({ users: formatted });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการจัดการบัญชีผู้ใช้งาน" }, { status: 403 });
    }
    console.error("List users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth("manage_users", req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const { email, displayName, password, permissions = [] } = parseResult.data;

    // Check scope: non-owners cannot grant high-level permissions or permissions they don't have
    if (user.role !== "owner") {
      const hasHighLevel = permissions.some((p) => HIGH_LEVEL_PERMISSIONS.includes(p));
      if (hasHighLevel) {
        return NextResponse.json(
          { error: "เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์มอบสิทธิ์ระดับสูง (manage_users หรือ view_audit_logs)" },
          { status: 403 }
        );
      }

      const unauthorized = permissions.filter((p) => !user.permissions.includes(p));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: `คุณไม่สามารถมอบสิทธิ์ที่ตนเองไม่ได้รับอนุญาตได้ (${unauthorized.join(", ")})` },
          { status: 403 }
        );
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Create admin user and permissions in a transaction
    const newAdmin = await prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          email: normalizedEmail,
          displayName: displayName.trim(),
          passwordHash,
          role: "admin",
          isActive: true,
        },
      });

      for (const perm of permissions) {
        await tx.adminPermission.create({
          data: {
            userId: created.id,
            permissionKey: perm,
            grantedBy: user.id,
          },
        });
      }

      return created;
    });

    // Audit Log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "CREATE_ADMIN",
      entityType: "user",
      entityId: newAdmin.id,
      newValues: {
        email: newAdmin.email,
        displayName: newAdmin.displayName,
        role: newAdmin.role,
        permissions,
      },
      details: `สร้างบัญชีแอดมินใหม่: ${newAdmin.displayName} (${newAdmin.email})`,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        displayName: newAdmin.displayName,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
        permissions,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการสร้างบัญชีแอดมิน" }, { status: 403 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างบัญชีแอดมิน" }, { status: 500 });
  }
}
