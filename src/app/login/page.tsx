"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
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
    <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-blue-500/30 relative shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-600/30">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">ĐĂNG NHẬP HỆ THỐNG</h1>
          <p className="text-xs text-slate-400 mt-1">Đường Lên Đỉnh Tri Thức • Gameshow Arena</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setRole("player");
              setErrorMsg("");
            }}
            className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === "player"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            4 Thí Sinh
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("admin");
              setErrorMsg("");
            }}
            className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === "admin"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Quản Trị / MC
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === "player" ? (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Chọn Vị Trí Thí Sinh:
              </label>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPlayerSlot(slot)}
                    className={`h-12 rounded-xl font-black text-base transition-all border ${
                      playerSlot === slot
                        ? "bg-blue-600 border-blue-400 text-white glow-blue scale-105"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    TS {slot}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mã PIN Thí Sinh (Mặc định: {playerSlot}{playerSlot}{playerSlot}{playerSlot} hoặc 1234):
                </label>
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder={`Nhập ${playerSlot}${playerSlot}${playerSlot}${playerSlot}...`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Mã PIN Quản Trị Viên (Mặc định: admin123):
              </label>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Nhập mã admin123..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all"
          >
            ĐĂNG NHẬP VÀO HỆ THỐNG <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
          <Link href="/display" target="_blank" className="text-amber-400 hover:underline">
            Mở Màn Hình Máy Chiếu (Công khai) ➔
          </Link>
        </div>
      </div>
    </div>
  );
}
