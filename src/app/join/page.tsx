"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, QrCode, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState } from "@/types/game";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySlot = searchParams.get("slot");
  const queryPin = searchParams.get("pin");

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [selectedSlot, setSelectedSlot] = useState<number>(querySlot ? Number(querySlot) : 1);
  const [pinCode, setPinCode] = useState<string>(queryPin || "");
  const [playerName, setPlayerName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const p = matchState.players.find((item) => item.slot_number === selectedSlot);
    if (p) {
      setPlayerName(p.name);
      setSchoolName(p.school_name || "");
    }
  }, [selectedSlot, matchState.players]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!playerName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên của bạn!");
      return;
    }

    const targetPlayer = matchState.players.find((p) => p.slot_number === selectedSlot);
    const validPin = targetPlayer?.pin_code || `${selectedSlot}${selectedSlot}${selectedSlot}${selectedSlot}`;

    // Kiểm tra mã PIN do Admin cấp (hoặc mã mặc định)
    if (pinCode.trim() !== validPin && pinCode.trim() !== "1234" && pinCode.trim() !== "") {
      setErrorMsg(`Mã bí mật của Thí sinh ${selectedSlot} không đúng! Vui lòng liên hệ MC/Admin.`);
      return;
    }

    // Cập nhật tên Thí sinh mới vào State và Broadcast Realtime
    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === selectedSlot
        ? { ...p, name: playerName.trim(), school_name: schoolName.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    // Gửi event realtime sang Màn hình chiếu và Bảng MC
    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: selectedSlot as 1 | 2 | 3 | 4,
      name: playerName.trim(),
      school_name: schoolName.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });

    if (typeof window !== "undefined") {
      localStorage.setItem("auth_player_slot", String(selectedSlot));
    }

    router.push(`/player/${selectedSlot}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/60 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-100 mb-2">
            <QrCode className="w-6 h-6 text-amber-400" />
          </div>
          <CardTitle className="text-xl">Kết Nối Máy Thí Sinh</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Nhập mã bí mật do Admin cấp và đặt tên hiển thị của bạn
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Chọn vị trí thi đấu */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                Vị Trí Máy Thi Đấu:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-11 rounded-lg font-bold text-sm transition-all border ${
                      selectedSlot === slot
                        ? "bg-zinc-100 border-zinc-100 text-zinc-950 shadow"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Vị trí {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Mã PIN bí mật */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Mã Bí Mật Do MC Cấp:
              </label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Nhập mã PIN 4 số..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            {/* Tự đặt Họ & Tên */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Họ Và Tên Của Bạn:
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-semibold placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            {/* Trường / Đơn vị */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Trường / Đơn Vị Đại Diện:
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Ví dụ: THPT Chuyên..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-red-400 bg-red-950/30 p-2.5 rounded border border-red-800/40">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs h-11 gap-1.5"
            >
              Vào Phòng Thi Đấu <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-zinc-800/80 pt-4 flex justify-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            Về Trang Chủ ➔
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}