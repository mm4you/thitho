import { NextRequest, NextResponse } from "next/server";

// Global in-memory storage on server
let globalJudgeCode = "GK-OLYMPIA-2026";
let globalMatchState: any = null;

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    judge_code: globalJudgeCode,
    match_state: globalMatchState,
    timestamp: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.judge_code) {
      globalJudgeCode = String(body.judge_code).trim().toUpperCase();
    }
    if (body.match_state) {
      globalMatchState = body.match_state;
    }
    return NextResponse.json({
      success: true,
      judge_code: globalJudgeCode,
      updated_at: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
