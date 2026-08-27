"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SUPER_ADMIN_EMAIL, subscribeToGameChannel } from "@/lib/supabase";
import { RealtimeEventPayload } from "@/types/game";

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

      // Ban Giam Khao co quyen vao: /admin/live, /admin/players, /admin/questions
      // Chi rieng trang Trung Tam Toi Cao /admin la doc quyen cua Super Admin (ungnhutkhang53@gmail.com)
      const isSuperAdmin = email === SUPER_ADMIN_EMAIL || token.startsWith("SUPER_ADMIN_");
      if (!isSuperAdmin && pathname === "/admin") {
        router.push("/admin/live");
        return;
      }

      setIsAuthorized(true);
    }
  }, [router, pathname]);

  // Tu dong da Ban Giam Khao cu ra ngoai neu Quan Tri Vien doi ma moi
  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "REVOKE_ADMIN_SESSIONS") {
        if (typeof window !== "undefined") {
          const email = localStorage.getItem("admin_email");
          const token = localStorage.getItem("admin_auth_token");
          const isSuperAdmin = email === SUPER_ADMIN_EMAIL || token?.startsWith("SUPER_ADMIN_");

          if (!isSuperAdmin) {
            localStorage.removeItem("admin_auth_token");
            alert("Quản trị viên tối cao đã cấp mã Giám Khảo mới. Phiên cũ đã hết hạn!");
            router.push("/login");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

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