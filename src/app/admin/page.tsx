"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSavedMatchState } from "@/lib/supabase";
import { MatchState } from "@/types/game";
import { Sliders, Users, HelpCircle, Tv, ArrowRight, Trophy, Zap, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
          <Trophy className="w-6 h-6 text-amber-400" />
          Tổng Quan Trung Tâm Điều Phối MC
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Hệ thống điều khiển trận đấu trực tiếp 4 thí sinh theo chuẩn Olympia
        </p>
      </div>

      {/* 3 Main Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-100 mb-2">
              <Sliders className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-base">1. Điều Khiển Trận Đấu</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Tiến trình 5 bước logic: Bắt đầu đếm ngược, khóa bài, mở đáp án, chấm điểm và câu tiếp theo.
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-t border-zinc-800/80 pt-4">
            <Link href="/admin/live" className="w-full">
              <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs gap-1.5">
                Vào Bảng Điều Khiển <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-100 mb-2">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <CardTitle className="text-base">2. Kết Nối 4 Thí Sinh</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Quản lý 4 máy thi đấu: Cấp mã PIN bí mật ngẫu nhiên, copy link kết nối, chỉnh sửa tên thí sinh.
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-t border-zinc-800/80 pt-4">
            <Link href="/admin/players" className="w-full">
              <Button variant="secondary" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs gap-1.5">
                Quản Lý 4 Máy Thí Sinh <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-100 mb-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <CardTitle className="text-base">3. Ngân Hàng Câu Hỏi</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Soạn đề và nạp nhanh câu hỏi hàng loạt cho 4 vòng: Khởi động, VCHV, Tăng tốc, Về đích.
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-t border-zinc-800/80 pt-4">
            <Link href="/admin/questions" className="w-full">
              <Button variant="secondary" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs gap-1.5">
                Quản Lý Đề Thi <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* 4 Contestants Live Summary */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Trạng Thái 4 Vị Trí Thí Sinh Hiện Tại
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((p) => (
            <div
              key={p.slot_number}
              className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <Badge variant="outline" className="border-zinc-700 text-[10px] mb-1 font-mono">
                  MÁY {p.slot_number}
                </Badge>
                <div className="text-sm font-bold text-zinc-100 line-clamp-1">{p.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">Mã PIN: {p.pin_code || "Mặc định"}</div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-black text-amber-400">{p.score}</span>
                <span className="text-[10px] text-zinc-500 block">điểm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
