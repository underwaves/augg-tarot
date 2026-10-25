import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    const token = headerToken || cookieToken;

    const user = await getCurrentUser(token);
    if (user) {
      await logAudit({
        actorId: user.id,
        actorName: user.displayName,
        action: "LOGOUT",
        entityType: "auth",
        entityId: user.id,
        details: "ออกจากระบบสำเร็จ",
      });
    }

    await clearSessionCookie(token);

    return NextResponse.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการออกจากระบบ" },
      { status: 500 }
    );
  }
}
