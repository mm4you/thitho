"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sliders,
  Users,
  HelpCircle,
  Tv,
  LogOut,
  Home,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SUPER_ADMIN_EMAIL } from "@/lib/supabase";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("admin_email");
      const token = localStorage.getItem("admin_auth_token");
      if (email === SUPER_ADMIN_EMAIL || token?.startsWith("SUPER_ADMIN_")) {
        setIsSuperAdmin(true);
      } else {
        setIsSuperAdmin(false);
      }
    }
  }, []);

  const navItems = isSuperAdmin
    ? [
        {
          title: "Trung Tâm Tối Cao",
          href: "/admin",
          icon: Crown,
          badge: "SUPREME",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        },
        {
          title: "Điều Hành Trận Đấu",
          href: "/admin/live",
          icon: Sliders,
          badge: "Tự Động",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        },
        {
          title: "Cấp Mã 4 Thí Sinh",
          href: "/admin/players",
          icon: Users,
        },
        {
          title: "Soạn & Import Đề Thi",
          href: "/admin/questions",
          icon: HelpCircle,
        },
      ]
    : [
        {
          title: "Điều Hành Trận Đấu",
          href: "/admin/live",
          icon: Sliders,
          badge: "Tự Động",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        },
        {
          title: "Cấp Mã 4 Thí Sinh",
          href: "/admin/players",
          icon: Users,
        },
        {
          title: "Soạn & Import Đề Thi",
          href: "/admin/questions",
          icon: HelpCircle,
        },
      ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_auth_token");
      localStorage.removeItem("admin_email");
      router.push("/login");
    }
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070a12] flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800">
          <BrandLogo size="sm" />
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{isSuperAdmin ? "QUẢN TRỊ TỐI CAO" : "BÀN BAN GIÁM KHẢO"}</span>
            {isSuperAdmin && <Crown className="w-3 h-3 text-amber-400" />}
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
                  <Icon className={`w-4 h-4 ${item.badge === "SUPREME" ? "text-amber-400" : ""}`} />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
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

      {/* Role Profile & Logout */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
          {isSuperAdmin ? (
            <>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-black text-amber-400 uppercase block tracking-wider">SUPER ADMIN</span>
                <span className="text-[11px] font-semibold text-slate-300 block truncate">
                  Chủ Sở Hữu Hệ Thống
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-blue-400 uppercase block">BAN GIÁM KHẢO</span>
                <span className="text-[11px] font-semibold text-slate-300 block truncate">
                  Đầy Đủ Quyền Trận Đấu
                </span>
              </div>
            </>
          )}
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