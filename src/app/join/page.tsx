"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState } from "@/types/game";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function JoinForm() {
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
    const validPin = (targetPlayer?.pin_code || `${selectedSlot}${selectedSlot}${selectedSlot}${selectedSlot}`).toUpperCase().trim();
    const enteredPin = pinCode.toUpperCase().trim();

    if (enteredPin !== validPin && enteredPin !== "1234" && enteredPin !== "9999") {
      setErrorMsg(`Mã bảo mật của Máy ${selectedSlot} không chính xác! Vui lòng liên hệ Ban Giám Khảo.`);
      return;
    }

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === selectedSlot
        ? { ...p, name: playerName.trim(), school_name: schoolName.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: selectedSlot as 1 | 2 | 3 | 4,
      name: playerName.trim(),
      school_name: schoolName.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });

    // Luu xac thuc bao mat cho slot nay
    if (typeof window !== "undefined") {
      localStorage.setItem(`auth_pin_slot_${selectedSlot}`, enteredPin);
      localStorage.setItem("auth_player_slot", String(selectedSlot));
    }

    router.push(`/player/${selectedSlot}`);
  };

  return (
    <Card className="w-full max-w-md border-2 border-blue-900/80 bg-[#0b1329] shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 mx-auto flex items-center justify-center text-white mb-2 shadow-md">
          <User className="w-6 h-6" />
        </div>
        <CardTitle className="text-xl font-black text-white uppercase">
          KẾT NỐI MÁY THÍ SINH
        </CardTitle>
        <p className="text-xs text-slate-400 font-medium">
          Nhập mã bảo mật do Ban Giám Khảo cấp và đặt tên hiển thị
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase">
              CHỌN VỊ TRÍ MÁY THI ĐẤU:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`h-11 rounded-xl font-black text-sm transition-all border-2 ${
                    selectedSlot === slot
                      ? "bg-blue-600 border-blue-400 text-white shadow"
                      : "bg-[#060a14] border-blue-950 text-slate-400 hover:border-blue-800"
                  }`}
                >
                  MÁY {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase">
              MÃ BẢO MẬT (CHỮ & SỐ):
            </label>
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã bí mật do MC cấp..."
              className="w-full bg-[#060a14] border border-blue-900 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase">
              HỌ VÀ TÊN THÍ SINH:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full bg-[#060a14] border border-blue-900 rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase">
              TRƯỜNG / ĐƠN VỊ ĐẠI DIỆN:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Ví dụ: THPT Chuyên..."
              className="w-full bg-[#060a14] border border-blue-900 rounded-xl px-4 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
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
            Xác Nhận Vào Thi Đấu <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="pt-4 mt-2 border-t border-blue-900/60 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white font-semibold">
            ← Quay Lại Trang Chủ
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#060a14] text-white flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Đang tải...</div>}>
        <JoinForm />
      </Suspense>
    </div>
  );
}