"use client";

import Link from "next/link";
import { Tv, Sliders, User, ExternalLink, Trophy, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const players = [
    { slot: 1, name: "Thí sinh 1" },
    { slot: 2, name: "Thí sinh 2" },
    { slot: 3, name: "Thí sinh 3" },
    { slot: 4, name: "Thí sinh 4" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-6 md:p-12 font-sans selection:bg-zinc-800">
      {/* Top Header */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Đấu Trí Arena</h1>
            <p className="text-xs text-zinc-400">Hệ thống thi đấu 4 người chơi trực tiếp</p>
          </div>
        </div>
      </div>

      {/* Main Hero & Quick Access */}
      <div className="w-full max-w-5xl my-10 space-y-8">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50">
            Trung Tâm Điều Phối Cuộc Thi
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
            Chọn màn hình tương ứng để trình chiếu lên máy chiếu sân khấu, mở bảng điều khiển MC hoặc mở giao diện cho từng máy thí sinh.
          </p>
        </div>

        {/* 2 Main Cards: Display & Admin Live */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                <Tv className="w-5 h-5 text-amber-400" />
              </div>
              <CardTitle className="text-xl text-zinc-100 flex items-center justify-between">
                Màn Hình Sân Khấu / Máy Chiếu
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Giao diện toàn màn hình cho khán giả: Đếm ngược, lật mở đáp án 4 thí sinh, nổ điểm và âm thanh hiệu ứng.
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t border-zinc-800/60 pt-4">
              <Link href="/display" target="_blank" className="w-full">
                <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold gap-2">
                  Mở Màn Hình Chiếu <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                <Sliders className="w-5 h-5 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-zinc-100 flex items-center justify-between">
                Bảng Điều Khiển MC & Giám Khảo
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Điều phối trận đấu: Đếm ngược, khóa máy, giám sát câu trả lời thí sinh đang gõ, mở đáp án, duyệt điểm.
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t border-zinc-800/60 pt-4 flex gap-2">
              <Link href="/admin/live" className="flex-1">
                <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold gap-2">
                  Vào Bảng MC <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                  Soạn Đề
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* 4 Contestants Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Giao Diện 4 Máy Thí Sinh
            </h3>
            <Link href="/join" className="text-xs text-amber-400 hover:underline">
              Kết nối bằng mã PIN bí mật ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {players.map((p) => (
              <Card
                key={p.slot}
                className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-300">
                      Vị trí {p.slot}
                    </Badge>
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-zinc-100 line-clamp-1">
                    {p.name}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Link href={`/player/${p.slot}`} target="_blank" className="w-full">
                    <Button variant="secondary" size="sm" className="w-full bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200">
                      Vào thi đấu
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl border-t border-zinc-800/80 pt-6 flex items-center justify-between text-xs text-zinc-500">
        <p>Thi Thơ - Hệ Thống Gameshow Đấu Trí Trực Tiếp</p>
      </footer>
    </main>
  );
}