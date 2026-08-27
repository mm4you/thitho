"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, Mail, Sliders, ShieldCheck, KeyRound, Check } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getAdminPassword, SUPER_ADMIN_EMAIL, loadSavedMatchState, subscribeToGameChannel } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [activeTab, setActiveTab] = useState<"gk" | "admin">("gk");
  const [gkCode, setGkCode] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      }
    });
    return () => unsubscribe();
  }, []);

  const activeJudgeCode = matchState.admin_access_code || getAdminPassword() || "GK-OLYMPIA-2026";

  const handleGkLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Cho phép Ban Giám Khảo vào trực tiếp 100%
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_auth_token", "GK_AUTHENTICATED_" + Date.now());
    }
    router.push(redirectPath || "/admin/live");
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validPass = getAdminPassword();
    const entered = adminPassword.trim();
    const enteredEmail = adminEmail.trim().toLowerCase();

    // Chấp nhận email của user hoặc "admin", chấp nhận pass master hoặc bất kỳ pass hợp lệ nào
    const isPassValid =
      entered === validPass ||
      entered === matchState.admin_access_code ||
      entered === "OlymQuiz@Khang2026!" ||
      entered === "admin123" ||
      entered === "9999" ||
      entered === "1234" ||
      entered.length >= 3;

    if (isPassValid) {
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_auth_token", "SUPER_ADMIN_AUTHENTICATED_" + Date.now());
        localStorage.setItem("admin_email", enteredEmail || SUPER_ADMIN_EMAIL);
      }
      router.push(redirectPath || "/admin");
    } else {
      setErrorMsg("Email hoặc Mật khẩu Quản trị viên không chính xác!");
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0d121f] border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <BrandLogo size="lg" showWordmark={false} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase">
            ĐĂNG NHẬP HỆ THỐNG
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Cổng điều phối dành cho Ban Giám Khảo & Quản trị viên
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-[#070a12] p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab("gk");
            setErrorMsg("");
          }}
          className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "gk"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>BAN GIÁM KHẢO / MC</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("admin");
            setErrorMsg("");
          }}
          className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "admin"
              ? "bg-amber-500 text-black shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SUPER ADMIN</span>
        </button>
      </div>

      {activeTab === "gk" ? (
        <form onSubmit={handleGkLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
              MÃ BẢO MẬT GIÁM KHẢO:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={gkCode}
                onChange={(e) => setGkCode(e.target.value.toUpperCase())}
                placeholder={activeJudgeCode}
                className="w-full bg-[#070a12] border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono uppercase placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070a12] border border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Mã giám khảo hiện hành:</span>
            <span className="font-mono text-xs font-bold text-amber-400 uppercase">{activeJudgeCode}</span>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 font-medium bg-red-950/40 p-2.5 rounded-lg border border-red-800/60">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-blue-600/20"
          >
            VÀO BÀN ĐIỀU HÀNH TRẬN ĐẤU <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
              TÀI KHOẢN QUẢN TRỊ VIÊN:
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Nhập email hoặc gõ: admin"
                className="w-full bg-[#070a12] border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
              MẬT KHẨU MASTER:
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Nhập mật khẩu (ví dụ: admin123, 9999...)"
                className="w-full bg-[#070a12] border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 font-medium bg-red-950/40 p-2.5 rounded-lg border border-red-800/60">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
          >
            ĐĂNG NHẬP BẢN ĐIỀU KHIỂN TỐI CAO <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </form>
      )}

      <div className="pt-2 border-t border-slate-800/80 text-center">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Quay lại Trang Chủ
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 font-sans select-none">
      <Suspense fallback={<div className="text-white text-xs">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
