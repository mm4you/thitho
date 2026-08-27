"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent, subscribeToGameChannel } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
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
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "UPDATE_PLAYER_INFO") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number
              ? { ...p, name: event.name, school_name: event.school_name }
              : p
          ),
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const p = matchState.players.find((item) => item.slot_number === selectedSlot);
    if (p) {
      setPlayerName(p.name);
      setSchoolName(p.school_name || "");
    }
  }, [selectedSlot, matchState.players]);

  const proceedToPlayerSlot = (slot: number, name: string, school: string) => {
    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slot
        ? { ...p, name: name.trim() || `Thí sinh ${slot}`, school_name: school.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: slot as 1 | 2 | 3 | 4,
      name: name.trim() || `Thí sinh ${slot}`,
      school_name: school.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });

    if (typeof window !== "undefined") {
      localStorage.setItem(`auth_pin_slot_${slot}`, "AUTHENTICATED");
      localStorage.setItem("auth_player_slot", String(slot));
      localStorage.setItem("authenticated_slot", String(slot));
    }

    router.push(`/player/${slot}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    proceedToPlayerSlot(selectedSlot, playerName, schoolName);
  };

  return (
    <Card className="w-full max-w-md border border-slate-800 bg-[#0d121f] shadow-xl">
      <CardHeader className="text-center pb-4 space-y-2">
        <div className="flex justify-center">
          <BrandLogo size="lg" showWordmark={false} />
        </div>
        <CardTitle className="text-xl font-bold text-white uppercase">
          KẾT NỐI MÁY THÍ SINH
        </CardTitle>
        <p className="text-xs text-slate-400 font-medium">
          Chọn vị trí bục thi đấu và nhập họ tên để vào thi ngay
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">
              CHỌN VỊ TRÍ MÁY THI ĐẤU:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`h-11 rounded-xl font-bold text-sm transition-all border cursor-pointer ${
                    selectedSlot === slot
                      ? "bg-blue-600 border-blue-400 text-white shadow-sm scale-105"
                      : "bg-[#070a12] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  MÁY {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase">
              HỌ VÀ TÊN THÍ SINH:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase">
              TRƯỜNG / ĐƠN VỊ ĐẠI DIỆN:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Ví dụ: THPT Chuyên..."
              className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-blue-600/20"
          >
            VÀO PHÒNG THI ĐẤU (MÁY {selectedSlot}) <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <div className="pt-2 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
              ← Quay lại Trang Chủ
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 font-sans select-none">
      <Suspense fallback={<div className="text-white text-xs">Đang tải...</div>}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
