"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Tv, Sliders, ArrowRight, ShieldCheck, KeyRound, Trophy, Zap, ChevronRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [pinInput, setPinInput] = useState<string>("");

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    router.push(`/join?pin=${encodeURIComponent(pinInput.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-6 md:p-10 font-sans select-none relative overflow-hidden">
      {/* Glow Hiệu Ứng Sân Khấu Sang Trọng */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/15 via-amber-500/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Header Thanh Lịch */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <BrandLogo size="md" />

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-[#0d121f] border border-slate-800 hover:border-slate-700 hover:bg-[#131b2e] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Đăng Nhập MC</span>
        </Link>
      </header>

      {/* Trung Tâm: Hero Sân Khấu Trí Tuệ */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 space-y-10 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-amber-400 text-xs font-semibold shadow-inner">
            <Trophy className="w-3.5 h-3.5 fill-current" />
            <span className="tracking-wider uppercase">ĐẤU TRƯỜNG TRI THỨC ĐỈNH CAO</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
            ĐẤU TRÍ <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">ARENA</span>
          </h1>

          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Hệ thống thi đấu đối kháng trực tiếp 4 thí sinh với cơ chế tự động chấm điểm và xếp hạng mili-giây.
          </p>
        </div>

        {/* Khu Vực Tương Tác 2 Cổng Lớn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CỔNG 1: THÍ SINH NHẬP MÃ NHANH */}
          <div className="bg-[#0d121f] border-2 border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-7 flex flex-col justify-between space-y-6 transition-all shadow-2xl relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider">
                  CỔNG THÍ SINH
                </span>
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">
                  Vào Phòng Thi Đấu
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Nhập mã bảo mật (chữ & số) do Ban Tổ Chức cấp để kết nối
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickJoin} className="space-y-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã (Ví dụ: A8K2F)..."
                  className="flex-1 h-12 bg-[#070a12] border border-slate-700 focus:border-amber-400 rounded-xl px-4 text-sm font-mono font-bold text-white uppercase placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-12 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-amber-500/20 shrink-0"
                >
                  <span>VÀO THI</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
                <span>4 Bục Đấu: 🔴 Đỏ • 🔵 Xanh • 🟡 Vàng • 🟢 Lục</span>
              </div>
            </form>
          </div>

          {/* CỔNG 2: BAN TỔ CHỨC & MC */}
          <div className="bg-[#0d121f] border border-slate-800 hover:border-slate-700 rounded-3xl p-7 flex flex-col justify-between space-y-6 transition-all shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-bold uppercase tracking-wider">
                  BAN TỔ CHỨC
                </span>
                <Sliders className="w-5 h-5 text-blue-400" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">
                  Điều Phối & Máy Chiếu
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Bảng điều khiển 1 chạm cho MC và Màn hình trình chiếu sân khấu
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/admin/live" className="block">
                <button className="w-full h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-blue-600/20">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Bảng Điều Khiển MC
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link href="/display" target="_blank" className="block">
                <button className="w-full h-12 px-4 rounded-xl bg-[#141c2e] hover:bg-[#1a253c] border border-slate-800 hover:border-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-400" /> Mở Màn Hình Máy Chiếu Sân Khấu
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Spacer Sạch Sẽ */}
      <footer className="w-full max-w-5xl mx-auto" />
    </div>
  );
}