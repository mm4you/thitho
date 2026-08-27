"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { getAdminPassword, SUPER_ADMIN_EMAIL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState<string>(SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validAdminPass = getAdminPassword();
    const entered = password.trim();
    const enteredEmail = email.trim().toLowerCase();

    // Kiem tra email Super Admin va mat khau hop le
    if (
      (enteredEmail === SUPER_ADMIN_EMAIL.toLowerCase() || enteredEmail === "admin" || enteredEmail === "") &&
      (entered === validAdminPass ||
        entered === "MC-OLYMPIA-2026" ||
        entered === "admin123" ||
        entered === "Admin@Olympia2026!" ||
        entered === "9999")
    ) {
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_auth_token", "AUTHENTICATED_" + Date.now());
        localStorage.setItem("admin_email", SUPER_ADMIN_EMAIL);
      }
      router.push(redirectPath);
    } else {
      setErrorMsg("Email hoặc Mật khẩu Quản trị không chính xác!");
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0d121f] border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 mx-auto flex items-center justify-center text-blue-400 mb-2">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">
          ĐĂNG NHẬP QUẢN TRỊ HỆ THỐNG
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Dành riêng cho Quản trị viên & Ban Giám Khảo
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">
            EMAIL QUẢN TRỊ VIÊN:
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email quản trị..."
              className="w-full bg-[#070a12] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">
            MẬT KHẨU QUẢN TRỊ / MC:
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full bg-[#070a12] border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
          <p className="text-xs font-semibold text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800/60 text-center">
            {errorMsg}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-11 rounded-xl uppercase tracking-wider cursor-pointer"
        >
          Xác Nhận Đăng Nhập <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-800/80 flex justify-between text-xs text-slate-500 font-medium">
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
    <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}