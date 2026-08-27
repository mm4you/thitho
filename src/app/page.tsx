"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Tv, Sliders, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-center p-6 md:p-12 font-sans select-none">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-8">
        <BrandLogo size="md" />

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Đăng Nhập MC</span>
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-bold uppercase">
                  BAN GIÁM KHẢO
                </span>
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>

              <h3 className="text-2xl font-bold text-white">
                Điều Khiển & Máy Chiếu
              </h3>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <Link href="/admin/live" className="block">
                <button className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Bảng Điều Khiển MC
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link href="/display" target="_blank" className="block">
                <button className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-semibold text-xs uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" /> Mở Màn Hình Máy Chiếu
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-xs font-bold uppercase">
                  THÍ SINH THI ĐẤU
                </span>
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>

              <h3 className="text-2xl font-bold text-white">
                Kết Nối Máy Thi Đấu
              </h3>
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <Link href="/join" className="block">
                <button className="w-full py-5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow">
                  <KeyRound className="w-4 h-4" /> Nhập Mã Bảo Mật Vào Thi Đấu
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}