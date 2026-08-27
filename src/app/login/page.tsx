"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [role, setRole] = useState<"admin" | "player">("player");
  const [playerSlot, setPlayerSlot] = useState<number>(1);
  const [pinCode, setPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (role === "admin") {
      if (pinCode === "admin123" || pinCode === "9999" || pinCode === "admin") {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_role", "admin");
        }
        router.push(redirectPath === "/" ? "/admin/live" : redirectPath);
      } else {
        setErrorMsg("Mã PIN Quản trị viên không đúng! (Mặc định: admin123)");
      }
    } else {
      const validPins: Record<number, string[]> = {
        1: ["1111", "ts1", "pass1", "1234"],
        2: ["2222", "ts2", "pass2", "1234"],
        3: ["3333", "ts3", "pass3", "1234"],
        4: ["4444", "ts4", "pass4", "1234"],
      };

      const accepted = validPins[playerSlot] || ["1234"];
      if (accepted.includes(pinCode.toLowerCase().trim()) || pinCode === "") {
        if (typeof window !== "undefined") {
          localStorage.setItem(`auth_player_slot`, String(playerSlot));
        }
        router.push(`/player/${playerSlot}`);
      } else {
        setErrorMsg(`Mã PIN Thí sinh ${playerSlot} không đúng! (Mặc định: ${playerSlot}${playerSlot}${playerSlot}${playerSlot} hoặc 1234)`);
      }
    }
  };

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-100 mb-2">
          <Lock className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl">Đăng Nhập Hệ Thống</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Chọn vai trò và nhập mã PIN để vào phòng thi đấu
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
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
            <ShieldCheck className="w-3.5 h-3.5" /> Ban Giám Khảo
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === "player" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Chọn Vị Trí Thí Sinh:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPlayerSlot(slot)}
                      className={`h-10 rounded-lg font-bold text-sm transition-all border ${
                        playerSlot === slot
                          ? "bg-zinc-100 border-zinc-100 text-zinc-950"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      TS {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Mã PIN Thí Sinh (Mặc định: {playerSlot}{playerSlot}{playerSlot}{playerSlot}):
                </label>
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder={`Nhập ${playerSlot}${playerSlot}${playerSlot}${playerSlot}...`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Mã PIN Quản Trị Viên (Mặc định: admin123):
              </label>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Nhập mã admin123..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-medium text-red-400 bg-red-950/30 p-2.5 rounded border border-red-800/40">
              {errorMsg}
            </p>
          )}

          <Button type="submit" className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-10 gap-1.5">
            Đăng Nhập <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t border-zinc-800/80 pt-4 flex justify-center text-xs text-zinc-500">
        <Link href="/display" target="_blank" className="hover:text-zinc-300">
          Mở Màn Hình Máy Chiếu (Công khai) ➔
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