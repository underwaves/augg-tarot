import { NextRequest, NextResponse } from "next/server";
import { getQueueByTrackingToken } from "@/lib/tokens";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { error: "ไม่พบโทเคนติดตามคิว" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const result = await getQueueByTrackingToken(token);

    if (!result) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลคิว หรือลิงก์ติดตามคิวไม่ถูกต้อง" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    if ("error" in result) {
      if (result.error === "REVOKED") {
        return NextResponse.json(
          { error: "ลิงก์ติดตามคิวนี้ถูกเพิกถอนแล้ว กรุณาติดต่อทางร้านเพื่อขอรับลิงก์ใหม่" },
          {
            status: 410,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }
      if (result.error === "EXPIRED") {
        return NextResponse.json(
          { error: "ลิงก์ติดตามคิวนี้หมดอายุแล้ว กรุณาติดต่อทางร้านเพื่อขอรับลิงก์ใหม่" },
          {
            status: 410,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }
    }

    const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Magical Pastel Tarot 🔮";

    // Strictly send only public information. Never include internalNote or internal data.
    return NextResponse.json(
      {
        shopName,
        ...result.data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Public track API error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคิว กรุณาลองใหม่อีกครั้ง" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
