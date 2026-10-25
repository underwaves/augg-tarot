import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PERMISSION_KEYS, PermissionKey } from "@/lib/types";

export async function GET() {
  try {
    const { user } = await requireAuth("manage_users");

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
      return NextResponse.json({ error: "เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์จัดการบัญชีแอดมิน" }, { status: 403 });
    }
    console.error("List users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth("manage_users");
    const body = await req.json();

    const { email, displayName, password, permissions = [] } = body;

    if (!email || !displayName || !password) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

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

      // Filter valid permissions
      const validPerms = (permissions as string[]).filter((p): p is PermissionKey =>
        (PERMISSION_KEYS as readonly string[]).includes(p)
      );

      for (const perm of validPerms) {
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
