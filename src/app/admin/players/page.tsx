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
  RotateCcw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Trash2,
  AlertTriangle,
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
  const [statusMessage, setStatusMessage] = useState<string>("");

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

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // ĐỔI TÊN / TRƯỜNG / PIN THÍ SINH
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

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(newPin).catch(() => {});
      setCopiedSlot(slot);
      setTimeout(() => setCopiedSlot(null), 2500);
    }
    showToast(`Đã tạo mã mới cho Máy ${slot}: ${newPin}`);
  };

  // 1-CLICK RESET BỤC THÍ SINH CỤ THỂ (Xóa tên, đặt điểm = 0, tạo mã mới)
  const handleResetSingleSlot = (slot: number) => {
    const newPin = generateAlphanumericCode(4);
    const updated = matchState.players.map((p) =>
      p.slot_number === slot
        ? { ...p, name: `Thí sinh ${slot}`, school_name: "", score: 0, pin_code: newPin }
        : p
    );
    const newState = { ...matchState, players: updated };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    showToast(`Đã Reset hoàn toàn Bục Máy ${slot} về mặc định!`);
  };

  // 1-CLICK TẠO MỚI TOÀN BỘ 4 MÃ PIN (HỦY MÃ CŨ)
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
    showToast("Đã tạo mới toàn bộ 4 mã PIN thí sinh!");
  };

  // 1-CLICK RESET ĐIỂM 4 THÍ SINH VỀ 0
  const handleResetAllScores = () => {
    const updated = matchState.players.map((p) => ({ ...p, score: 0 }));
    const newState = { ...matchState, players: updated };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    showToast("Đã reset điểm số của 4 thí sinh về 0!");
  };

  // 1-CLICK RESET TOÀN DIỆN CẢ 4 BỤC ĐẤU (TRẬN THI ĐẤU MỚI)
  const handleResetAllSlotsCompletely = () => {
    const updated = matchState.players.map((p) => ({
      ...p,
      name: `Thí sinh ${p.slot_number}`,
      school_name: "",
      score: 0,
      pin_code: generateAlphanumericCode(4),
    }));
    const newState = {
      ...matchState,
      players: updated,
      is_standby: true,
      is_timer_running: false,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      star_of_hope_slot: null,
      active_player_slot: null,
      current_responses: {},
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    showToast("Đã Reset toàn bộ 4 bục đấu sẵn sàng cho trận mới!");
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
    showToast(`Đã sao chép Link & Mã Máy ${slot} vào Clipboard!`);
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

        {/* THÔNG BÁO TOAST NẾU CÓ */}
        {statusMessage && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs font-bold text-center shadow-lg animate-in fade-in">
            ✓ {statusMessage}
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN & BỘ NÚT RESET TỔNG */}
        <div className="bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#e0c588]" /> BỘ CÔNG CỤ ĐIỀU HÀNH & RESET BỤC ĐẤU
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Tự động đồng bộ thời gian thực và lưu trữ vĩnh viễn trên Server Cloud
              </p>
            </div>

            {/* CÁC NÚT RESET NHANH */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleResetAllScores}
                variant="outline"
                className="border-slate-700 hover:border-amber-500 text-amber-300 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Điểm Về 0
              </Button>

              <Button
                onClick={handleGenerateNewPinsForAll}
                className="bg-[#c5a059] hover:bg-[#b48f48] text-black font-black text-xs h-9 px-3.5 rounded-xl cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Tạo Mới 4 Mã PIN
              </Button>

              <Button
                onClick={handleResetAllSlotsCompletely}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs h-9 px-3.5 rounded-xl cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset Cả 4 Bục Máy
              </Button>
            </div>
          </div>
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

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-[#e0c588]">
                      {p.score} Điểm
                    </span>

                    {/* NÚT RESET RIÊNG CHO BỤC NÀY */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetSingleSlot(slot)}
                      className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 h-8 px-2 rounded-lg cursor-pointer transition-colors"
                      title={`Reset Bục Máy ${slot}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Bục
                    </Button>
                  </div>
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
