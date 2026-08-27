"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sliders, Users, HelpCircle, Tv, LogOut, Trophy, Home, LayoutDashboard, UserCheck } from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "@/lib/supabase";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      title: "Tổng Quan Hệ Thống",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Điều Khiển Trận Đấu",
      href: "/admin/live",
      icon: Sliders,
      badge: "5 Bước",
    },
    {
      title: "Mã MC & 4 Thí Sinh",
      href: "/admin/players",
      icon: Users,
    },
    {
      title: "Ngân Hàng Câu Hỏi",
      href: "/admin/questions",
      icon: HelpCircle,
    },
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_auth_token");
      router.push("/login");
    }
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070a12] flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold shadow-sm">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white uppercase">QUẢN TRỊ HỆ THỐNG</h2>
              <p className="text-[10px] text-slate-400 font-medium">olymquiz.vercel.app</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            CHỨC NĂNG CHÍNH
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/40">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            TRÌNH CHIẾU & ĐIỀU HƯỚNG
          </div>

          <Link
            href="/display"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Mở Màn Hình Máy Chiếu</span>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Admin Profile & Logout */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">QUẢN TRỊ VIÊN</span>
            <span className="text-[11px] font-semibold text-slate-300 block truncate" title={SUPER_ADMIN_EMAIL}>
              {SUPER_ADMIN_EMAIL}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất</span>
          </div>
        </button>
      </div>
    </aside>
  );
}