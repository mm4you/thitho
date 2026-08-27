import { NextRequest, NextResponse } from "next/server";

function normalizeCode(str: string): string {
  if (!str) return "";
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^GK/, "");
}

// Lưu trữ DUY NHẤT MỘT MÃ ĐANG HOẠT ĐỘNG (Single Active Judge Code)
let currentActiveJudgeCode = "GK-4H46SH";

export async function GET(req: NextRequest) {
  const enteredQuery = req.nextUrl.searchParams.get("code");
  if (enteredQuery) {
    const cleanEntered = normalizeCode(enteredQuery);
    const cleanActive = normalizeCode(currentActiveJudgeCode);

    // CHỈ CHẤP NHẬN DUY NHẤT MÃ ĐANG HOẠT ĐỘNG (hoặc mã Master Super Admin)
    const isValid =
      cleanEntered === cleanActive ||
      cleanEntered === "OLYMQUIZKHANG2026";

    return NextResponse.json({
      success: true,
      is_valid: isValid,
      current_code: currentActiveJudgeCode,
    });
  }

  return NextResponse.json({
    success: true,
    judge_code: currentActiveJudgeCode,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.judge_code) {
      const code = String(body.judge_code).trim().toUpperCase();
      // Ghi đè mã mới - Toàn bộ mã cũ bị hủy bỏ ngay lập tức
      currentActiveJudgeCode = code;
    }
    return NextResponse.json({
      success: true,
      judge_code: currentActiveJudgeCode,
      updated_at: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
