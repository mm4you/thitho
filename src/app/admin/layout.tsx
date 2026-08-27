"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SUPER_ADMIN_EMAIL } from "@/lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_auth_token");
      const email = localStorage.getItem("admin_email");

      if (!token) {
        setIsAuthorized(false);
        router.push("/login?redirect=" + encodeURIComponent(pathname));
        return;
      }

      // Neu la Ban Giam Khao va co gang vao trang quan ly ma toi cao (/admin, /admin/players)
      // thi tu dong chuyen ve trang /admin/live
      const isSuperAdmin = email === SUPER_ADMIN_EMAIL || token.startsWith("SUPER_ADMIN_");
      if (!isSuperAdmin && (pathname === "/admin" || pathname === "/admin/players")) {
        router.push("/admin/live");
        return;
      }

      setIsAuthorized(true);
    }
  }, [router, pathname]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4">
        <div className="text-xs font-semibold text-slate-500 animate-pulse">
          Đang xác thực quyền truy cập...
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col md:flex-row font-sans">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}