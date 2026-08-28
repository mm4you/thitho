"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Tv, Sliders, ArrowRight, ShieldCheck, KeyRound, Trophy, ChevronRight, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [pinInput, setPinInput] = useState<string>("");

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    router.push(`/join?pin=${encodeURIComponent(pinInput.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans select-none relative overflow-hidden">
      {/* Dynamic Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[350px] bg-gradient-to-b from-blue-600/15 via-amber-500/10 to-transparent blur-[140px] pointer-events-none" />

      {/* HEADER */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <BrandLogo size="md" />

        <Link
          href="/login"
          className="px-4 py-2 rounded-2xl bg-[#0b1020] border border-slate-800 hover:border-slate-700 hover:bg-[#111827] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Cổng Ban Giám Khảo</span>
        </Link>
      </header>

      {/* MAIN CENTER PORTAL */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 space-y-10 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-lg">
            <Trophy className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="tracking-widest uppercase">ĐẤU TRƯỜNG TRI THỨC ĐỈNH CAO 2026</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
            OLYMQUIZ <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">ARENA</span>
          </h1>

          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed font-medium">
            Hệ thống điều phối thi đấu đối kháng trực tuyến 4 thí sinh chuẩn format Olympia với chấm điểm tự động mili-giây.
          </p>
        </div>

        {/* 3 KHỐI ĐIỀU HƯỚNG CÂN ĐỐI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CỔNG 1: THÍ SINH */}
          <div className="bg-[#0b1020] border-2 border-blue-500/40 hover:border-blue-500/80 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-blue-600/20 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-black uppercase tracking-wider">
                  MÁY THÍ SINH
                </span>
                <Crown className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                Bục Đấu Thí Sinh
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Dành cho 4 thí sinh bước lên bục đấu, nhận đề thi và bấm chuông.
              </p>
            </div>

            <Link href="/join" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-blue-600/20">
                Vào Bục Thi Đấu <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* CỔNG 2: MÀN MÁY CHIẾU TRƯỜNG QUAY */}
          <div className="bg-[#0b1020] border-2 border-amber-500/40 hover:border-amber-500/80 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-amber-500/20 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider">
                  MÀN TRƯỜNG QUAY
                </span>
                <Tv className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                Màn Hình Máy Chiếu
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Chiếu toàn cảnh sân khấu, bảng điểm 4 thí sinh và âm thanh đồng hồ.
              </p>
            </div>

            <Link href="/display" target="_blank" className="w-full">
              <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/20">
                Mở Màn Máy Chiếu <Tv className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* CỔNG 3: BÀN ĐIỀU HÀNH GIÁM KHẢO */}
          <div className="bg-[#0b1020] border-2 border-emerald-500/40 hover:border-emerald-500/80 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-emerald-600/20 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider">
                  BAN GIÁM KHẢO
                </span>
                <Sliders className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                Bàn Điều Hành Live
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Dành cho MC và Ban Giám Khảo bấm giờ, mở đáp án và điều chỉnh điểm.
              </p>
            </div>

            <Link href="/login" className="w-full">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20">
                Đăng Nhập Điều Hành <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-900 z-10">
        <span>© 2026 OlymQuiz Arena • Bản Quyền Thuộc Về Ban Tổ Chức</span>
        <span className="font-mono text-slate-600">v2.4.0 (Broadcast Edition)</span>
      </footer>
    </div>
  );
}
