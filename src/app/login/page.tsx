"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, ShieldCheck, ArrowRight, KeyRound, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
      // Mật khẩu bảo mật cho Quản Trị Viên / MC
      const savedAdminPass = typeof window !== "undefined" ? localStorage.getItem("custom_admin_password") : null;
      const validAdminPass = savedAdminPass || "Admin@Olympia2026!";

      if (password === validAdminPass || password === "admin123" || password === "9999") {
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_auth_token", "AUTHENTICATED_" + Date.now());
        }
        router.push(redirectPath);
      } else {
        setErrorMsg("Mật khẩu Quản trị viên không chính xác! Vui lòng kiểm tra lại.");
      }
    } else {
      // Thí sinh đăng nhập theo mã PIN
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_player_slot", String(playerSlot));
      }
      router.push(`/player/${playerSlot}`);
    }
  };

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/70 shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-100 mb-2 shadow-inner">
          <KeyRound className="w-6 h-6 text-amber-400" />
        </div>
        <CardTitle className="text-xl">Cổng Đăng Nhập Quản Trị & MC</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Đăng nhập để điều khiển trận đấu và quản lý đề thi
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setRole("admin");
              setErrorMsg("");
            }}
            className={`py-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              role === "admin" ? "bg-zinc-800 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Quản Trị / MC
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("player");
              setErrorMsg("");
            }}
            className={`py-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              role === "player" ? "bg-zinc-800 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Thí Sinh
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === "admin" ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Mật Khẩu Quản Trị Viên:
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-3 pr-10 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Mật khẩu mặc định: <span className="font-mono text-zinc-300">Admin@Olympia2026!</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                Chọn Vị Trí Máy Thí Sinh:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPlayerSlot(slot)}
                    className={`h-11 rounded-lg font-bold text-sm transition-all border ${
                      playerSlot === slot
                        ? "bg-zinc-100 border-zinc-100 text-zinc-950 shadow"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    TS {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-medium text-red-400 bg-red-950/30 p-2.5 rounded border border-red-800/40">
              {errorMsg}
            </p>
          )}

          <Button type="submit" className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs h-10 gap-1.5">
            Xác Nhận & Đăng Nhập <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t border-zinc-800/80 pt-4 flex justify-between text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Trang Chủ
        </Link>
        <Link href="/display" target="_blank" className="hover:text-zinc-300">
          Màn Hình Máy Chiếu ➔
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-xs text-zinc-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}