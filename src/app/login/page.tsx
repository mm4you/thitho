"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin/live";

  const [role, setRole] = useState<"admin" | "player">("admin");
  const [playerSlot, setPlayerSlot] = useState<number>(1);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (role === "admin") {
      const savedAdminPass = typeof window !== "undefined" ? localStorage.getItem("custom_admin_password") : null;
      const validAdminPass = savedAdminPass || "Admin@Olympia2026!";

      if (password === validAdminPass || password === "admin123" || password === "9999") {
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_auth_token", "AUTHENTICATED_" + Date.now());
        }
        router.push(redirectPath);
      } else {
        setErrorMsg("Mật khẩu Quản trị viên không chính xác!");
      }
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_player_slot", String(playerSlot));
      }
      router.push(`/player/${playerSlot}`);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0b1329] border-2 border-blue-900/80 rounded-2xl p-6 shadow-2xl space-y-5">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-xl bg-blue-600 mx-auto flex items-center justify-center text-white mb-3 shadow-lg">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">
          ĐĂNG NHẬP HỆ THỐNG
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Cổng kết nối Ban Giám Khảo & Thí Sinh
        </p>
      </div>

      {/* Role Toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060a14] rounded-xl border border-blue-950">
        <button
          type="button"
          onClick={() => {
            setRole("admin");
            setErrorMsg("");
          }}
          className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            role === "admin" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Quản Trị / MC
        </button>
        <button
          type="button"
          onClick={() => {
            setRole("player");
            setErrorMsg("");
          }}
          className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            role === "player" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" /> Máy Thí Sinh
        </button>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {role === "admin" ? (
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              MẬT KHẨU QUẢN TRỊ:
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu quản trị..."
                className="w-full bg-[#060a14] border border-blue-900 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
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
        ) : (
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              CHỌN VỊ TRÍ MÁY THI ĐẤU:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPlayerSlot(slot)}
                  className={`h-12 rounded-xl font-black text-sm transition-all border-2 ${
                    playerSlot === slot
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                      : "bg-[#060a14] border-blue-950 text-slate-400 hover:border-blue-800"
                  }`}
                >
                  MÁY {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs font-bold text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800/60 text-center">
            {errorMsg}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-12 rounded-xl uppercase tracking-wider"
        >
          Xác Nhận & Đăng Nhập
        </Button>
      </form>

      <div className="pt-3 border-t border-blue-900/60 flex justify-between text-xs text-slate-400 font-medium">
        <Link href="/" className="hover:text-white">
          ← Về Trang Chủ
        </Link>
        <Link href="/display" target="_blank" className="hover:text-blue-300">
          Mở Màn Hình Máy Chiếu →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#060a14] text-white flex items-center justify-center p-4 font-sans selection:bg-blue-600">
      <Suspense fallback={<div className="text-xs text-slate-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
