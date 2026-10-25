import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PERMISSION_KEYS, PermissionKey } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("manage_users");
    const { id } = params;
    const body = await req.json();

    const targetUser = await prisma.profile.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    // Protection 1: Non-owner cannot modify owner
    if (targetUser.role === "owner" && user.role !== "owner") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลเจ้าของร้าน" }, { status: 403 });
    }

    // Protection 2: Prevent deactivating the last active owner
    if (targetUser.role === "owner" && body.isActive === false) {
      const activeOwners = await prisma.profile.count({
        where: { role: "owner", isActive: true },
      });
      if (activeOwners <= 1) {
        return NextResponse.json(
          { error: "ไม่สามารถปิดใช้งานเจ้าของร้านคนสุดท้ายได้" },
          { status: 400 }
        );
      }
    }

    const { displayName, isActive, permissions, newPassword } = body;

    await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = String(displayName).trim();
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (newPassword && newPassword.length >= 8) {
        updateData.passwordHash = await hashPassword(newPassword);
      }

      await tx.profile.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided and user is not owner
      if (Array.isArray(permissions) && targetUser.role !== "owner") {
        await tx.adminPermission.deleteMany({
          where: { userId: id },
        });

        const validPerms = (permissions as string[]).filter((p): p is PermissionKey =>
          (PERMISSION_KEYS as readonly string[]).includes(p)
        );

        for (const p of validPerms) {
          await tx.adminPermission.create({
            data: {
              userId: id,
              permissionKey: p,
              grantedBy: user.id,
            },
          });
        }
      }
    });

    // Audit Log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "UPDATE_USER",
      entityType: "user",
      entityId: id,
      details: `อัปเดตข้อมูลบัญชีผู้ใช้ ${targetUser.displayName} (${targetUser.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการจัดการบัญชีผู้ใช้งาน" }, { status: 403 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน" }, { status: 500 });
  }
}
