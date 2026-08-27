"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sliders, Users, HelpCircle, Tv, LogOut, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      title: "Điều Khiển Trận Đấu",
      href: "/admin/live",
      icon: Sliders,
      badge: "5 Bước",
    },
    {
      title: "Kết Nối 4 Thí Sinh",
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
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-100">Quản Trị MC</h2>
              <p className="text-[10px] text-zinc-500 font-mono">DASHBOARD</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Chức Năng Chính
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-zinc-100" : "text-zinc-500"}`} />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Trình Chiếu
          </div>

          <Link
            href="/display"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Màn Hình Máy Chiếu</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
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
