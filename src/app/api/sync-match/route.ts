import { NextRequest, NextResponse } from "next/server";
import { MatchState } from "@/types/game";
import { initialMatchState } from "@/lib/mockData";

// BỘ NHỚ LƯU TRỮ SERVER-SIDE TRUNG TÂM CHO TOÀN BỘ CÁC THIẾT BỊ
let serverMatchState: MatchState = { ...initialMatchState };

export async function GET() {
  return NextResponse.json({
    success: true,
    state: serverMatchState,
    updated_at: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.state) {
      serverMatchState = body.state;
    }
    return NextResponse.json({
      success: true,
      state: serverMatchState,
      updated_at: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
