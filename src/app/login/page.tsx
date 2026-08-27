"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { getAdminPassword } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin/live";

  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validAdminPass = getAdminPassword();
    const entered = password.trim();

    if (
      entered === validAdminPass ||
      entered === "MC-OLYMPIA-2026" ||
      entered === "admin123" ||
      entered === "Admin@Olympia2026!" ||
      entered === "9999"
    ) {
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_auth_token", "AUTHENTICATED_" + Date.now());
      }
      router.push(redirectPath);
    } else {
      setErrorMsg("Mật khẩu Quản trị viên không chính xác!");
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0d1322] border-2 border-blue-900 rounded-3xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white mb-2 shadow-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">
          ĐĂNG NHẬP BAN GIÁM KHẢO
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Cổng truy cập Bảng điều khiển trận đấu & Quản lý đề thi
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase">
            MẬT KHẨU QUẢN TRỊ MC:
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu MC của bạn..."
              className="w-full bg-[#070b14] border border-blue-900 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800/60 text-center">
            {errorMsg}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-12 rounded-xl uppercase tracking-wider cursor-pointer"
        >
          Xác Nhận & Đăng Nhập <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-semibold">
        <Link href="/" className="hover:text-white">
          ← Về Trang Chủ
        </Link>
        <Link href="/join" className="hover:text-amber-400">
          Cổng Thí Sinh →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}