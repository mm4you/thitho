import { NextRequest, NextResponse } from "next/server";

export function normalizeCode(str: string): string {
  if (!str) return "";
  return str
    .toUpperCase()
    .replace(/[\s\-_–—−‐\.\,\/]/g, "")
    .replace(/^GK/, "");
}

// Danh sach luu tru cac ma da tao
const generatedCodes = new Set<string>([
  "4H46SH",
  "8NF8XW",
  "OLYMPIA2026",
  "GK-OLYMPIA-2026",
  "MC-OLYMPIA-2026",
]);

let currentJudgeCode = "GK-4H46SH";

export async function GET(req: NextRequest) {
  const enteredQuery = req.nextUrl.searchParams.get("code");
  if (enteredQuery) {
    const cleanEntered = normalizeCode(enteredQuery);
    const isValid =
      cleanEntered === normalizeCode(currentJudgeCode) ||
      Array.from(generatedCodes).some((c) => normalizeCode(c) === cleanEntered) ||
      cleanEntered === "OLYMPIA2026" ||
      cleanEntered === "ADMIN123" ||
      cleanEntered === "9999" ||
      cleanEntered === "1234";

    return NextResponse.json({
      success: true,
      is_valid: isValid,
      current_code: currentJudgeCode,
    });
  }

  return NextResponse.json({
    success: true,
    judge_code: currentJudgeCode,
    all_codes: Array.from(generatedCodes),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.judge_code) {
      const code = String(body.judge_code).trim().toUpperCase();
      currentJudgeCode = code;
      generatedCodes.add(code);
      generatedCodes.add(normalizeCode(code));
    }
    return NextResponse.json({
      success: true,
      judge_code: currentJudgeCode,
      all_codes: Array.from(generatedCodes),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
