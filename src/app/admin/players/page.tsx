"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadSavedMatchState,
  saveMatchStateLocally,
  sendGameEvent,
  subscribeToGameChannel,
  getAdminPassword,
  setAdminPassword,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Users,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 6, prefix = ""): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminPlayersManagementPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [originUrl, setOriginUrl] = useState<string>("");

  const [currentAdminPass, setCurrentAdminPass] = useState<string>("GK-OLYMPIA-2026");
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [isEditingAdminPass, setIsEditingAdminPass] = useState<boolean>(false);
  const [tempAdminPass, setTempAdminPass] = useState<string>("");
  const [adminPassSavedAlert, setAdminPassSavedAlert] = useState<boolean>(false);
  const [copiedAdminPass, setCopiedAdminPass] = useState<boolean>(false);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
      const pass = getAdminPassword();
      setCurrentAdminPass(pass);
      setTempAdminPass(pass);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "UPDATE_PLAYER_INFO") {
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

  const handleGenerateRandomAdminPass = () => {
    const newPass = generateAlphanumericCode(6, "GK-");
    setTempAdminPass(newPass);
    setIsEditingAdminPass(true);
  };

  const handleSaveAdminPass = () => {
    if (!tempAdminPass.trim()) return;
    setAdminPassword(tempAdminPass.trim());
    setCurrentAdminPass(tempAdminPass.trim());
    setIsEditingAdminPass(false);
    setAdminPassSavedAlert(true);
    setTimeout(() => setAdminPassSavedAlert(false), 3000);
  };

  const handleCopyAdminPass = () => {
    navigator.clipboard.writeText(currentAdminPass);
    setCopiedAdminPass(true);
    setTimeout(() => setCopiedAdminPass(false), 2000);
  };

  const handleGenerateRandomPlayerCodes = () => {
    const updatedPlayers = matchState.players.map((p) => {
      const randCode = generateAlphanumericCode(5);
      return { ...p, pin_code: randCode };
    });

    const newState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleCopyLink = (slot: number, code: string) => {
    const joinUrl = `${originUrl || "https://olymquiz.vercel.app"}/join?slot=${slot}&pin=${code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedSlot(slot);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const handleResetScores = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại điểm số của 4 thí sinh về 0?")) {
      const updatedPlayers = matchState.players.map((p) => ({ ...p, score: 0 }));
      const newState = { ...matchState, players: updatedPlayers };
      setMatchState(newState);
      saveMatchStateLocally(newState);
      sendGameEvent({ type: "SYNC_STATE", state: newState });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans select-none">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            QUẢN LÝ MÃ BẢO MẬT BAN GIÁM KHẢO & THÍ SINH
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Sinh mã ngẫu nhiên cho Ban Giám Khảo và 4 máy thí sinh
          </p>
        </div>

        <Link href="/admin/live">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow">
            <Sliders className="w-4 h-4" /> Bàn Ban Giám Khảo
          </Button>
        </Link>
      </div>

      {/* KHU VỰC 1: MÃ BAN GIÁM KHẢO */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase text-white">MÃ TRUY CẬP BAN GIÁM KHẢO</h2>
              <p className="text-xs text-slate-400 font-medium">Cấp mã này cho Ban Giám Khảo để điều hành trận đấu</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateRandomAdminPass}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sinh Mã Mới
          </Button>
        </div>

        {isEditingAdminPass ? (
          <div className="flex flex-wrap items-center gap-3 bg-[#070a12] p-4 rounded-xl border border-slate-800">
            <input
              type="text"
              value={tempAdminPass}
              onChange={(e) => setTempAdminPass(e.target.value)}
              placeholder="Nhập mã Giám Khảo mới..."
              className="flex-1 min-w-[200px] bg-[#0d121f] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500 uppercase"
            />
            <Button
              size="sm"
              onClick={handleSaveAdminPass}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Lưu Mã
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingAdminPass(false)}
              className="text-xs h-9 text-slate-400 hover:text-white"
            >
              Hủy
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between bg-[#070a12] p-4 rounded-xl border border-slate-800 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-bold text-slate-400">MÃ ĐANG DÙNG:</span>
              <span className="font-mono text-xl font-bold text-amber-400 tracking-wider">
                {showAdminPass ? currentAdminPass : "••••••••••••"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title={showAdminPass ? "Ẩn" : "Hiện"}
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <Button
                size="sm"
                onClick={handleCopyAdminPass}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer"
              >
                {copiedAdminPass ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Mã Cấp Cho Giám Khảo
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTempAdminPass(currentAdminPass);
                  setIsEditingAdminPass(true);
                }}
                className="border-slate-700 text-slate-300 text-xs h-9 px-3 cursor-pointer"
              >
                Sửa
              </Button>
            </div>
          </div>
        )}

        {adminPassSavedAlert && (
          <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/60 text-center animate-in fade-in">
            Đã lưu mã Giám Khảo mới thành công!
          </p>
        )}
      </div>

      {/* KHU VỰC 2: MÃ 4 THÍ SINH */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold uppercase text-white">MÃ BẢO MẬT 4 THÍ SINH (CHỮ & SỐ)</h2>
            <p className="text-xs text-slate-400 font-medium">Gửi link kèm mã cho 4 thí sinh đăng nhập trên laptop</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetScores}
              className="border-slate-800 text-slate-400 hover:text-red-400 text-xs h-8 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Điểm
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateRandomPlayerCodes}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-8 px-3 gap-1.5 cursor-pointer shadow"
            >
              <RefreshCw className="w-3 h-3" /> Sinh Mã 4 Máy
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const code = player.pin_code || `${player.slot_number}${player.slot_number}${player.slot_number}${player.slot_number}`;

            return (
              <div
                key={player.slot_number}
                className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                      {player.slot_number}
                    </span>
                    <span className="font-bold text-xs text-white uppercase">MÁY {player.slot_number}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-400">{player.score} đ</span>
                </div>

                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white line-clamp-1">{player.name}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{player.school_name || "Thí sinh"}</div>
                </div>

                <div className="bg-[#070a12] border border-slate-800 rounded-lg p-2.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">MÃ BẢO MẬT:</span>
                  <span className="font-mono text-xl font-bold text-amber-400 tracking-widest">{code}</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleCopyLink(player.slot_number, code)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 gap-1 cursor-pointer"
                  >
                    {copiedSlot === player.slot_number ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Đã Copy!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Link TS {player.slot_number}
                      </>
                    )}
                  </Button>

                  <a
                    href={`/join?slot=${player.slot_number}&pin=${code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-slate-400 hover:text-blue-400 flex items-center justify-center gap-1 py-0.5"
                  >
                    Mở kết nối máy này <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}