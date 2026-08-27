"use client";

import Link from "next/link";
import { Tv, Sliders, Trophy, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-black shadow-md">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-white">ĐẤU TRÍ ARENA</h1>
            <p className="text-xs font-semibold text-slate-400">HỆ THỐNG THI ĐẤU OLYMPIA TRỰC TIẾP</p>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Đăng Nhập MC</span>
        </Link>
      </div>

      {/* 2 Cổng Truy Cập Cực Kỳ Tinh Gọn */}
      <div className="w-full max-w-5xl mx-auto my-auto py-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            CHỌN CỔNG TRUY CẬP HỆ THỐNG
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CỔNG 1: BAN TỔ CHỨC & MC */}
          <div className="bg-[#0d1322] border-2 border-blue-900 rounded-3xl p-8 flex flex-col justify-between shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-black uppercase">
                  BAN GIÁM KHẢO
                </span>
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>

              <h3 className="text-2xl font-black uppercase text-white">
                ĐIỀU KHIỂN & MÁY CHIẾU
              </h3>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <Link href="/admin/live" className="block">
                <button className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between shadow cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Bảng Điều Khiển MC
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link href="/display" target="_blank" className="block">
                <button className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" /> Mở Màn Hình Máy Chiếu
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* CỔNG 2: THÍ SINH */}
          <div className="bg-[#0d1322] border-2 border-amber-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded bg-amber-500 text-black text-xs font-black uppercase">
                  THÍ SINH THI ĐẤU
                </span>
                <KeyRound className="w-6 h-6 text-amber-400" />
              </div>

              <h3 className="text-2xl font-black uppercase text-white">
                KẾT NỐI MÁY THI ĐẤU
              </h3>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Link href="/join" className="block">
                <button className="w-full py-4 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer">
                  <KeyRound className="w-5 h-5" /> NHẬP MÃ BẢO MẬT ĐỂ VÀO PHÒNG THI
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Tinh Gọn */}
      <div className="w-full max-w-5xl mx-auto border-t border-slate-800 pt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>OLYMPIA ARENA PLATFORM</span>
        <span>HỆ THỐNG THI ĐẤU TRỰC TIẾP</span>
      </div>
    </main>
  );
}