"use client";

import Link from "next/link";
import { Tv, Sliders, User, Trophy, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between border-b-2 border-blue-900/60 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">DAU TRI ARENA</h1>
            <p className="text-xs font-semibold text-blue-300">HE THONG THI DAU OLYMPIA TRUC TIEP</p>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-blue-950 border border-blue-800 hover:bg-blue-900 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Dang Nhap MC</span>
        </Link>
      </div>

      {/* Main Content: 2 Cong Tach Bach Ro Rang */}
      <div className="w-full max-w-6xl mx-auto my-auto py-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
            CHON CONG TRUY CAP
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-medium">
            Vui long chon dung vai tro cua ban de truy cap he thong thi dau
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PHAN 1: CONG DANG CHO BAN TO CHUC & MC */}
          <div className="bg-[#0b1329] border-2 border-blue-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-wider">
                  KHU VUC BAN TO CHUC
                </span>
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>

              <h3 className="text-2xl font-black uppercase text-white">
                DIEU PHOI & SAN KHAU
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dau vao danh rieng cho Ban Giam Khao dieu khien tran dau va Mo man hinh may chieu hoi truong.
              </p>

              <div className="space-y-2.5 pt-2">
                <Link href="/admin/live" className="block">
                  <button className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-blue-600/20">
                    <span className="flex items-center gap-2">
                      <Sliders className="w-4 h-4" /> Bang Dieu Khien MC (Yeu cau mat khau)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>

                <Link href="/display" target="_blank" className="block">
                  <button className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-amber-500/20">
                    <span className="flex items-center gap-2">
                      <Tv className="w-4 h-4" /> Man Hinh May Chieu San Khau
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-blue-900/60 text-xs text-slate-500 font-medium">
              Quan ly de thi, cap ma random va cham diem tu dong
            </div>
          </div>

          {/* PHAN 2: CONG DANG CHO 4 THI SINH */}
          <div className="bg-[#0b1329] border-2 border-amber-500/60 rounded-3xl p-8 flex flex-col justify-between shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider">
                  KHU VUC THI SINH
                </span>
                <User className="w-6 h-6 text-amber-400" />
              </div>

              <h3 className="text-2xl font-black uppercase text-white">
                CONG KET NOI MAY THI DAU
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                4 thi sinh nhap ma bao mat do MC cap de ket noi may va dat ten hien thi.
              </p>

              <div className="pt-2">
                <Link href="/join" className="block">
                  <button className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                    <KeyRound className="w-5 h-5" /> NHAP MA BAO MAT VAO PHONG THI
                  </button>
                </Link>
              </div>

              {/* 4 Nut May Nhanh */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[1, 2, 3, 4].map((slot) => (
                  <Link key={slot} href={`/join?slot=${slot}`}>
                    <div className="bg-[#060a14] border border-slate-800 hover:border-amber-500 rounded-xl p-3 text-center transition-all">
                      <span className="text-[10px] font-bold text-slate-400 block">MAY</span>
                      <span className="text-base font-black text-amber-400">{slot}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-blue-900/60 text-xs text-slate-500 font-medium">
              May thi sinh chi duoc thao tac khi MC bam bat dau cau hoi
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto border-t-2 border-blue-900/60 pt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>OLYMPIA ARENA PLATFORM</span>
        <span>HE THONG THI DAU TRUC TIEP CHUYEN NGHIEP</span>
      </div>
    </main>
  );
}
