"use client";

import Link from "next/link";
import { Tv, Sliders, User, ExternalLink, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function HomePage() {
  const players = [
    { slot: 1, name: "Thí sinh 1 (Nguyễn Hoàng Nam)", color: "from-blue-600 to-cyan-500", glow: "hover:border-blue-400" },
    { slot: 2, name: "Thí sinh 2 (Trần Thu Hà)", color: "from-purple-600 to-pink-500", glow: "hover:border-purple-400" },
    { slot: 3, name: "Thí sinh 3 (Lê Minh Quân)", color: "from-emerald-600 to-teal-500", glow: "hover:border-emerald-400" },
    { slot: 4, name: "Thí sinh 4 (Phạm Thảo Vy)", color: "from-amber-600 to-yellow-500", glow: "hover:border-amber-400" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-3xl mb-12 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-4 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          HỆ THỐNG GAMESHOW ĐẤU TRÍ TRỰC TIẾP
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-amber-300 bg-clip-text text-transparent mb-4">
          ĐƯỜNG LÊN ĐỈNH TRI THỨC
        </h1>
        <p className="text-slate-400 text-lg md:text-xl">
          Đồng bộ thời gian thực siêu tốc với Supabase Realtime • Bảng điều khiển MC • Màn hình Sân khấu • 4 Máy Thí sinh
        </p>
      </div>

      {/* Quick Launch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl z-10 mb-12">
        {/* 1. Màn hình Sân khấu (Projector Display) */}
        <Link
          href="/display"
          target="_blank"
          className="group relative glass-panel rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/50 hover:shadow-[0_0_35px_rgba(255,209,102,0.25)] flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Tv className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-2 flex items-center justify-between">
              Màn Hình Máy Chiếu Sân Khấu
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-amber-300" />
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Trình chiếu toàn màn hình cho khán đài: Đồng hồ đếm ngược, hiệu ứng lật mở đáp án kịch tính 4 thí sinh, nổ điểm số, âm thanh SFX và đồ họa sân khấu.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center text-xs font-semibold text-amber-400">
            DÀNH CHO MÁY CHIẾU / MÀN HÌNH LED LỚN ➔
          </div>
        </Link>

        {/* 2. Bảng điều khiển MC / Giám Khảo */}
        <Link
          href="/admin/live"
          target="_blank"
          className="group relative glass-panel rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:border-blue-400/50 hover:shadow-[0_0_35px_rgba(58,134,255,0.25)] flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Sliders className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 group-hover:text-blue-300 transition-colors mb-2 flex items-center justify-between">
              Bảng Điều Khiển MC / Giám Khảo
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-300" />
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Trung tâm điều phối: Bấm đếm ngược, khóa máy, xem trước câu trả lời thí sinh đang gõ theo thời gian thực, lật mở đáp án, duyệt điểm tự động hoặc thủ công.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center text-xs font-semibold text-blue-400">
            DÀNH CHO MC / BAN TỔ CHỨC ➔
          </div>
        </Link>
      </div>

      {/* 4 Máy Thí Sinh */}
      <div className="w-full max-w-5xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Giao Diện 4 Máy Thí Sinh (Mở trên điện thoại / Laptop thí sinh)
          </h3>
          <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-200 underline">
            Quản lý ngân hàng câu hỏi
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((p) => (
            <Link
              key={p.slot}
              href={`/player/${p.slot}`}
              target="_blank"
              className={`glass-panel rounded-xl p-5 border border-slate-700/60 transition-all duration-300 hover:scale-105 ${p.glow} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center font-bold text-white shadow-lg`}>
                  {p.slot}
                </div>
                <Zap className="w-4 h-4 text-slate-500 group-hover:text-yellow-400" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Vị trí {p.slot}</div>
                <div className="font-bold text-slate-100 text-base line-clamp-1">{p.name}</div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700/40 text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Vào thi đấu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 text-center text-xs text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        Sẵn sàng kết nối Supabase Realtime Engine • Độ trễ &lt; 50ms
      </div>
    </main>
  );
}
