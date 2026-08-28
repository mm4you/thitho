"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UserCheck, Sparkles, KeyRound, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent, subscribeToGameChannel } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Button } from "@/components/ui/button";

function normalizeInputCode(code: string): string {
  return (code || "").toUpperCase().replace(/[\s\-_–—]/g, "").trim();
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySlot = searchParams.get("slot");

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [selectedSlot, setSelectedSlot] = useState<number>(querySlot ? Number(querySlot) : 1);
  const [playerName, setPlayerName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
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

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPlayer = matchState.players.find((item) => item.slot_number === selectedSlot);
    const requiredPin = targetPlayer?.pin_code || "";

    if (requiredPin && normalizeInputCode(pinCode) !== normalizeInputCode(requiredPin)) {
      setErrorMsg(`Mã PIN bảo mật cho Máy ${selectedSlot} không chính xác! Vui lòng hỏi Ban Tổ Chức.`);
      return;
    }

    if (typeof window !== "undefined" && pinCode) {
      sessionStorage.setItem(`player_pin_slot_${selectedSlot}`, pinCode.trim());
    }

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === selectedSlot
        ? { ...p, name: playerName.trim() || `Thí sinh ${selectedSlot}`, school_name: schoolName.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: selectedSlot as 1 | 2 | 3 | 4,
      name: playerName.trim() || `Thí sinh ${selectedSlot}`,
      school_name: schoolName.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });

    router.push(`/player/${selectedSlot}`);
  };

  return (
    <div className="w-full max-w-md bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-7 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <BrandLogo size="md" showWordmark={false} />
        </div>
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
          KẾT NỐI MÁY THÍ SINH
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Chọn vị trí bục thi đấu và nhập mã bảo mật để bước vào sàn đấu
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1.5 uppercase">
            CHỌN VỊ TRÍ MÁY THI ĐẤU:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSelectedSlot(slot);
                  setErrorMsg("");
                }}
                className={`h-11 rounded-xl font-mono font-bold text-xs transition-all border cursor-pointer ${
                  selectedSlot === slot
                    ? "bg-[#c5a059] border-[#e0c588] text-black shadow-md scale-105 font-black"
                    : "bg-[#060c1a] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                MÁY {slot}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1 uppercase">
            MÃ PIN BẢO MẬT DO ADMIN CẤP:
          </label>
          <input
            type="text"
            value={pinCode}
            onChange={(e) => {
              setPinCode(e.target.value.toUpperCase());
              setErrorMsg("");
            }}
            placeholder="Nhập mã PIN máy..."
            className="w-full bg-[#060c1a] border border-slate-800 focus:border-[#e0c588] rounded-xl px-4 py-2.5 text-sm font-mono font-black text-[#f4e5be] tracking-widest placeholder:text-slate-600 focus:outline-none uppercase"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1 uppercase">
            HỌ VÀ TÊN THÍ SINH:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            className="w-full bg-[#060c1a] border border-slate-800 focus:border-[#e0c588] rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1 uppercase">
            TRƯỜNG / ĐƠN VỊ ĐẠI DIỆN:
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Ví dụ: THPT Chuyên..."
            className="w-full bg-[#060c1a] border border-slate-800 focus:border-[#e0c588] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20"
        >
          VÀO PHÒNG THI ĐẤU (MÁY {selectedSlot}) <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>

        <div className="pt-2 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 font-mono">
            ← Quay lại Trang Chủ
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-[100dvh] bg-[#060c1a] text-slate-100 flex items-center justify-center p-4 font-sans select-none">
      <Suspense fallback={<div className="text-white text-xs">Đang tải...</div>}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
