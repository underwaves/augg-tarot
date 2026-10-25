import { NextRequest, NextResponse } from "next/server";
import { getQueueByTrackingToken } from "@/lib/tokens";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: "ไม่พบโทเคนติดตามคิว" }, { status: 400 });
    }

    const result = await getQueueByTrackingToken(token);

    if (!result) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลคิว หรือลิงก์ติดตามคิวไม่ถูกต้อง" },
        { status: 404 }
      );
    }

    if ("error" in result) {
      if (result.error === "REVOKED") {
        return NextResponse.json(
          { error: "ลิงก์ติดตามคิวนี้ถูกเพิกถอนแล้ว กรุณาติดต่อทางร้านเพื่อขอรับลิงก์ใหม่" },
          { status: 410 }
        );
      }
      if (result.error === "EXPIRED") {
        return NextResponse.json(
          { error: "ลิงก์ติดตามคิวนี้หมดอายุแล้ว" },
          { status: 410 }
        );
      }
    }

    const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Magical Pastel Tarot 🔮";

    return NextResponse.json({
      shopName,
      ...result.data,
    });
  } catch (error) {
    console.error("Public track API error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคิว กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
