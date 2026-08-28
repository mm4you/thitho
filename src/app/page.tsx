"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Tv, Sliders, ArrowRight, ShieldCheck, Trophy, Sparkles, UserCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[#060c1a] text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans select-none relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[320px] bg-gradient-to-b from-[#e0c588]/10 via-[#0a152e]/5 to-transparent blur-[140px] pointer-events-none" />

      {/* HEADER */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <BrandLogo size="md" />

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-[#091326] border border-[#e0c588]/30 hover:border-[#e0c588] text-[#f4e5be] hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-[#e0c588]" />
          <span>Cổng Ban Giám Khảo</span>
        </Link>
      </header>

      {/* MAIN CENTER PORTAL */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 space-y-10 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#091326] border border-[#e0c588]/40 text-[#f4e5be] text-xs font-semibold shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-[#e0c588]" />
            <span className="tracking-widest uppercase font-mono">ĐẤU TRƯỜNG TRI THỨC ĐỈNH CAO 2026</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
            OLYM<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fef3c7] via-[#e0c588] to-[#c5a059]">QUIZ</span> ARENA
          </h1>
        </div>

        {/* 3 KHỐI ĐIỀU HƯỚNG CÂN ĐỐI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CỔNG 1: THÍ SINH */}
          <div className="bg-[#091326] border border-slate-800 hover:border-[#e0c588]/80 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-[#e0c588]/10 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  MÁY THÍ SINH
                </span>
                <Crown className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#f4e5be] transition-colors">
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

          {/* CỔNG 2: MÀN MÁY CHIẾU */}
          <div className="bg-[#091326] border-2 border-[#e0c588]/40 hover:border-[#e0c588] rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-[#e0c588]/20 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[#e0c588]/20 text-[#f4e5be] border border-[#e0c588]/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                  MÀN TRƯỜNG QUAY
                </span>
                <Tv className="w-5 h-5 text-[#e0c588]" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#f4e5be] transition-colors">
                Màn Hình Máy Chiếu
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Chiếu toàn cảnh sân khấu, bảng điểm 4 thí sinh và âm thanh đồng hồ.
              </p>
            </div>

            <Link href="/display" target="_blank" className="w-full">
              <Button className="w-full bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/30">
                Mở Màn Máy Chiếu <Tv className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* CỔNG 3: BAN GIÁM KHẢO */}
          <div className="bg-[#091326] border border-slate-800 hover:border-emerald-500/80 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-emerald-600/10 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  BAN GIÁM KHẢO
                </span>
                <Sliders className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
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
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-900 z-10 font-mono">
        <span>© 2026 OlymQuiz Arena • Bản Quyền Ban Tổ Chức</span>
        <span className="text-[#e0c588]/80">Nobel Academic Edition</span>
      </footer>
    </div>
  );
}
