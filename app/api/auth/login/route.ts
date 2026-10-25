import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
    }

    const { email, password } = body || {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าของร้าน" },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // Set HTTP-only session cookie and retrieve session token
    const token = await setSessionCookie(user.id);

    // Audit log
    await logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "LOGIN",
      entityType: "auth",
      entityId: user.id,
      details: `เข้าสู่ระบบสำเร็จในฐานะ ${user.role}`,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("Configuration error")) {
      console.error("Login configuration error:", error.message);
      return NextResponse.json(
        { error: "ระบบยังไม่ได้รับการตั้งค่าความปลอดภัยที่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 500 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
