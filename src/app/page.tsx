"use client";

import Link from "next/link";
import { Tv, Sliders, Users, ExternalLink, Trophy, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between border-b-2 border-blue-900/60 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">ĐẤU TRÍ ARENA</h1>
            <p className="text-xs font-semibold text-blue-300">HỆ THỐNG THI ĐẤU OLYMPIA TRỰC TIẾP</p>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Cổng Chính */}
      <div className="w-full max-w-6xl mx-auto my-auto py-10 space-y-8">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            TRUNG TÂM ĐIỀU PHỐI CUỘC THI
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl font-medium">
            Chọn màn hình tương ứng để chiếu lên màn hình lớn hoặc mở bảng điều khiển Ban Giám Khảo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Máy Chiếu */}
          <div className="bg-[#0b1329] border-2 border-blue-800/80 rounded-3xl p-8 flex flex-col justify-between hover:border-blue-500 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Tv className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black uppercase text-white">
                MÀN HÌNH SÂN KHẤU / MÁY CHIẾU
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dành cho khán giả và hội trường: Đồng hồ đếm ngược, lật mở đáp án 4 thí sinh, nổ điểm và pháo hoa.
              </p>
            </div>

            <div className="pt-8 mt-4 border-t border-blue-900/60">
              <Link href="/display" target="_blank">
                <button className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                  MỞ MÀN HÌNH MÁY CHIẾU <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Card 2: Bảng Điều Khiển MC */}
          <div className="bg-[#0b1329] border-2 border-blue-800/80 rounded-3xl p-8 flex flex-col justify-between hover:border-blue-500 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                <Sliders className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black uppercase text-white">
                BẢNG ĐIỀU KHIỂN MC & GIÁM KHẢO
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dành cho Ban Giám Khảo: Đếm ngược, khóa bài, chấm điểm tự động theo mili-giây, cấp mã PIN 4 máy.
              </p>
            </div>

            <div className="pt-8 mt-4 border-t border-blue-900/60">
              <Link href="/admin/live">
                <button className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                  VÀO BẢNG ĐIỀU PHỐI MC <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Máy Thí Sinh */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              4 MÁY THÍ SINH THI ĐẤU
            </h4>
            <Link href="/join" className="text-xs font-bold text-amber-400 hover:underline">
              Kết nối bằng mã PIN bí mật ➔
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((slot) => (
              <Link key={slot} href={`/player/${slot}`} target="_blank">
                <div className="bg-[#0b1329] border border-blue-900/80 hover:border-blue-500 rounded-2xl p-4 text-center transition-all">
                  <span className="text-xs font-bold text-slate-400 block mb-1">MÁY THI ĐẤU</span>
                  <span className="text-lg font-black text-white">VỊ TRÍ {slot}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto border-t-2 border-blue-900/60 pt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>OLYMPIA ARENA PLATFORM</span>
        <span>HỆ THỐNG THI ĐẤU TRỰC TIẾP</span>
      </div>
    </main>
  );
}
