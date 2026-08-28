"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadSavedMatchState,
  saveMatchStateLocally,
  sendGameEvent,
  subscribeToGameChannel,
  syncMatchStateToCloud,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload, PlayerState } from "@/types/game";
import {
  Users,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

function generateAlphanumericCode(length = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminPlayersManagementPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [originUrl, setOriginUrl] = useState<string>("");
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      }
    });
    return () => unsubscribe();
  }, []);

  // ĐỔI TÊN THÍ SINH
  const handleUpdatePlayer = (slot: number, field: "name" | "school_name" | "pin_code", value: string) => {
    const updated = matchState.players.map((p) =>
      p.slot_number === slot ? { ...p, [field]: value } : p
    );
    const newState = { ...matchState, players: updated };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  // 1-CLICK TẠO MÃ MỚI CHO 1 MÁY
  const handleGenerateNewPinForSlot = (slot: number) => {
    const newPin = generateAlphanumericCode(4);
    const updated = matchState.players.map((p) =>
      p.slot_number === slot ? { ...p, pin_code: newPin } : p
    );
    const newState = { ...matchState, players: updated };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });

    // Copy mã vào clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(newPin).catch(() => {});
      setCopiedSlot(slot);
      setTimeout(() => setCopiedSlot(null), 2500);
    }
  };

  // 1-CLICK RESET TẤT CẢ MÃ 4 THÍ SINH (HỦY MÃ CŨ TOÀN DIỆN)
  const handleGenerateNewPinsForAll = () => {
    const updated = matchState.players.map((p) => ({
      ...p,
      pin_code: generateAlphanumericCode(4),
    }));
    const newState = { ...matchState, players: updated };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });

    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const handleCopyLink = (slot: number) => {
    const p = matchState.players.find((item) => item.slot_number === slot);
    const link = `${originUrl}/player/${slot}`;
    const textToCopy = `BỤC ĐẤU MÁY ${slot} - ${p?.name || ""}\n🔗 Link: ${link}\n🔑 Mã PIN bảo mật: ${p?.pin_code || ""}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
      setCopiedSlot(slot);
      setTimeout(() => setCopiedSlot(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#060c1a] text-slate-100 p-6 md:p-10 font-sans select-none pb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <BrandLogo size="md" />
            <div>
              <h1 className="text-xl font-black uppercase text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#e0c588]" /> QUẢN LÝ 4 THÍ SINH & MÃ BẢO MẬT (PIN)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Cấp mã PIN vào phòng thi, phân bổ 4 bục đấu và reset quyền truy cập tức thì
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/live">
              <Button className="bg-[#c5a059] hover:bg-[#b48f48] text-black font-black text-xs h-10 px-4 rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20">
                <Sliders className="w-4 h-4 mr-1.5" /> Bàn Giám Khảo Live
              </Button>
            </Link>
          </div>
        </header>

        {/* NÚT TẠO MÃ TỔNG CHO TOÀN BỘ 4 THÍ SINH */}
        <div className="bg-[#091326] border border-[#e0c588]/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#e0c588]" /> CƠ CHẾ BẢO MẬT THÍ SINH (SINGLE ACTIVE PIN)
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Khi bạn bấm tạo mã mới, tất cả mã cũ của thí sinh sẽ lập tức bị hủy bỏ trên hệ thống Cloud.
            </p>
          </div>

          <Button
            onClick={handleGenerateNewPinsForAll}
            className="bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs h-11 px-5 rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20 shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {copiedAll ? "ĐÃ TẠO MỚI TOÀN BỘ 4 MÃ!" : "TẠO MỚI MÃ CẢ 4 THÍ SINH"}
          </Button>
        </div>

        {/* DANH SÁCH 4 BỤC ĐẤU THÍ SINH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matchState.players.map((p) => {
            const slot = p.slot_number;
            const isCopied = copiedSlot === slot;

            return (
              <div
                key={slot}
                className="bg-[#091326] border border-slate-800 hover:border-[#e0c588]/60 rounded-3xl p-6 space-y-4 shadow-xl transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-black uppercase px-2.5 py-1 rounded-lg bg-[#060c1a] text-[#e0c588] border border-[#e0c588]/40">
                      MÁY {slot}
                    </span>
                    <span className="text-sm font-bold text-white">Bục Đấu #{slot}</span>
                  </div>

                  <span className="font-mono text-lg font-black text-[#e0c588]">
                    {p.score} Điểm
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                      HỌ VÀ TÊN THÍ SINH:
                    </label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleUpdatePlayer(slot, "name", e.target.value)}
                      placeholder={`Thí sinh ${slot}`}
                      className="w-full bg-[#060c1a] border border-slate-700 focus:border-[#e0c588] rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                      TRƯỜNG / ĐƠN VỊ ĐẠI DIỆN:
                    </label>
                    <input
                      type="text"
                      value={p.school_name || ""}
                      onChange={(e) => handleUpdatePlayer(slot, "school_name", e.target.value)}
                      placeholder="THPT Chuyên..."
                      className="w-full bg-[#060c1a] border border-slate-700 focus:border-[#e0c588] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  {/* KHU VỰC MÃ BẢO MẬT PIN */}
                  <div className="pt-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                      MÃ PIN BẢO MẬT VÀO THI:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={p.pin_code || ""}
                        onChange={(e) => handleUpdatePlayer(slot, "pin_code", e.target.value.toUpperCase())}
                        className="flex-1 bg-[#060c1a] border border-slate-700 focus:border-[#e0c588] rounded-xl px-3.5 py-2 font-mono font-black text-sm text-[#f4e5be] tracking-widest uppercase focus:outline-none text-center"
                      />
                      <Button
                        onClick={() => handleGenerateNewPinForSlot(slot)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-10 px-3 rounded-xl cursor-pointer"
                        title="Tạo mã ngẫu nhiên"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* NÚT COPY LINK & MỞ PHÒNG */}
                <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                  <Button
                    onClick={() => handleCopyLink(slot)}
                    className="flex-1 bg-[#060c1a] hover:bg-[#0d1c3a] border border-slate-700 hover:border-[#e0c588] text-[#f4e5be] font-bold text-xs h-10 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "ĐÃ SAO CHÉP LINK & MÃ!" : "SAO CHÉP LINK THI ĐẤU"}</span>
                  </Button>

                  <Link href={`/player/${slot}`} target="_blank">
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white text-xs h-10 px-3 rounded-xl cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
