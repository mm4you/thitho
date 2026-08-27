"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sliders, Users, HelpCircle, Tv, LogOut, Trophy, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      title: "Dieu Khien Tran Dau",
      href: "/admin/live",
      icon: Sliders,
      badge: "5 Buoc",
    },
    {
      title: "Ket Noi 4 Thi Sinh",
      href: "/admin/players",
      icon: Users,
    },
    {
      title: "Ngan Hang Cau Hoi",
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
    <aside className="w-64 border-r border-blue-900/60 bg-[#060a14] flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-black shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white uppercase">QUAN TRI MC</h2>
              <p className="text-[10px] text-blue-400 font-bold tracking-wider">OLYMPIA ARENA</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            CHUC NANG CHINH
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-blue-950/40"
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

          <div className="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            TRINH CHIEU & DIEU HUONG
          </div>

          <Link
            href="/display"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-amber-300 hover:bg-blue-950/40 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Mo Man Hinh May Chieu</span>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-blue-950/40 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4" />
              <span>Ve Trang Chu</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-blue-900/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            <span>Dang Xuat Quan Tri</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
