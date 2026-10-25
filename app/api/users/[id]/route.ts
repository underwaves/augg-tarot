import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PERMISSION_KEYS, PermissionKey } from "@/lib/types";
import { updateUserSchema, formatZodError } from "@/lib/validation";

const HIGH_LEVEL_PERMISSIONS: PermissionKey[] = ["manage_users", "view_audit_logs"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth("manage_users", req);
    const { id } = params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const targetUser = await prisma.profile.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    // Protection 1: Self-escalation / self-modification of privileges
    if (user.id === id) {
      if (body.permissions !== undefined) {
        return NextResponse.json(
          { error: "ผู้ดูแลระบบไม่สามารถแก้ไขสิทธิ์ของบัญชีตนเองได้ เพื่อความปลอดภัย" },
          { status: 403 }
        );
      }
      if (body.role !== undefined && body.role !== targetUser.role) {
        return NextResponse.json(
          { error: "ผู้ดูแลระบบไม่สามารถเปลี่ยนบทบาทของบัญชีตนเองได้" },
          { status: 403 }
        );
      }
      if (body.isActive === false) {
        return NextResponse.json(
          { error: "ไม่สามารถปิดการใช้งานบัญชีของตนเองได้" },
          { status: 400 }
        );
      }
    }

    // Protection 2: Non-owner cannot modify owner
    if (targetUser.role === "owner" && user.role !== "owner") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลเจ้าของร้าน" }, { status: 403 });
    }

    // Protection 3: Prevent deactivating the last active owner
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

    // Protection 4: Scope checking for permissions and role
    if (body.role !== undefined && body.role !== targetUser.role) {
      if (user.role !== "owner") {
        return NextResponse.json(
          { error: "เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้" },
          { status: 403 }
        );
      }
    }

    if (body.permissions !== undefined && targetUser.role !== "owner") {
      if (user.role !== "owner") {
        // High-level permissions can ONLY be granted by the owner
        const hasHighLevel = body.permissions.some((p: PermissionKey) => HIGH_LEVEL_PERMISSIONS.includes(p));
        const targetHadHighLevel = targetUser.permissions.some((p) =>
          HIGH_LEVEL_PERMISSIONS.includes(p.permissionKey as PermissionKey)
        );

        if (hasHighLevel && !targetHadHighLevel) {
          return NextResponse.json(
            { error: "เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์มอบสิทธิ์ระดับสูง (manage_users หรือ view_audit_logs)" },
            { status: 403 }
          );
        }

        // Caller cannot grant permissions they do not possess
        const unauthorizedPerms = body.permissions.filter((p: PermissionKey) => !user.permissions.includes(p));
        if (unauthorizedPerms.length > 0) {
          return NextResponse.json(
            { error: `คุณไม่สามารถมอบสิทธิ์ที่ตนเองไม่ได้รับอนุญาตได้ (${unauthorizedPerms.join(", ")})` },
            { status: 403 }
          );
        }
      }
    }

    const { displayName, isActive, permissions, newPassword, role } = body;
    const oldPermissions = targetUser.permissions.map((p) => p.permissionKey);
    let permissionsChanged = false;
    let passwordChanged = false;
    let deactivated = false;

    await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName.trim();
      if (isActive !== undefined) {
        updateData.isActive = isActive;
        if (isActive === false && targetUser.isActive === true) {
          deactivated = true;
        }
      }
      if (role !== undefined && user.role === "owner") {
        updateData.role = role;
      }
      if (newPassword) {
        updateData.passwordHash = await hashPassword(newPassword);
        passwordChanged = true;
      }

      await tx.profile.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided and user is not owner
      if (Array.isArray(permissions) && targetUser.role !== "owner") {
        permissionsChanged = true;
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

    // Revoke sessions if password changed or account deactivated
    if (passwordChanged || deactivated) {
      await revokeAllUserSessions(id);
    }

    // Audit Log: Record permission or profile changes with explicit oldValues and newValues
    const auditAction = permissionsChanged ? "UPDATE_PERMISSIONS" : "UPDATE_USER";
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: auditAction,
      entityType: "user",
      entityId: id,
      oldValues: {
        role: targetUser.role,
        isActive: targetUser.isActive,
        permissions: oldPermissions,
        displayName: targetUser.displayName,
      },
      newValues: {
        role: role !== undefined ? role : targetUser.role,
        isActive: isActive !== undefined ? isActive : targetUser.isActive,
        permissions: permissions !== undefined ? permissions : oldPermissions,
        displayName: displayName !== undefined ? displayName.trim() : targetUser.displayName,
        passwordChanged,
      },
      details: permissionsChanged
        ? `แก้ไขสิทธิ์บัญชีผู้ใช้ ${targetUser.displayName} (${targetUser.email})`
        : `อัปเดตข้อมูลบัญชีผู้ใช้ ${targetUser.displayName} (${targetUser.email})`,
    });

    return NextResponse.json({ success: true, message: "อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว" });
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
