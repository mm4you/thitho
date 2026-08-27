"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
  Copy,
  Check,
  Edit2,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 6, prefix = ""): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminPlayersPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);
  const [copiedAdminPass, setCopiedAdminPass] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [tempName, setTempName] = useState<string>("");
  const [tempSchool, setTempSchool] = useState<string>("");
  const [originUrl, setOriginUrl] = useState<string>("");

  // MC Password State
  const [currentAdminPass, setCurrentAdminPass] = useState<string>("MC-OLYMPIA-2026");
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [isEditingAdminPass, setIsEditingAdminPass] = useState<boolean>(false);
  const [tempAdminPass, setTempAdminPass] = useState<string>("");
  const [adminPassSavedAlert, setAdminPassSavedAlert] = useState<boolean>(false);

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
    const newPass = generateAlphanumericCode(6, "MC-");
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
    const joinUrl = `${originUrl || "http://localhost:3000"}/join?slot=${slot}&pin=${code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedSlot(slot);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const handleStartEdit = (slot: number, name: string, school: string) => {
    setEditingSlot(slot);
    setTempName(name);
    setTempSchool(school || "");
  };

  const handleSavePlayer = (slot: number) => {
    if (!tempName.trim()) return;

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slot
        ? { ...p, name: tempName.trim(), school_name: tempSchool.trim() }
        : p
    );

    const newState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    saveMatchStateLocally(newState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: slot as 1 | 2 | 3 | 4,
      name: tempName.trim(),
      school_name: tempSchool.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: newState });

    setEditingSlot(null);
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
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            QUẢN LÝ MÃ BẢO MẬT MC & THÍ SINH
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Tạo và lưu trữ lâu dài mã truy cập cho Ban Giám Khảo và 4 máy thi đấu
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetScores}
            className="border-zinc-800 text-slate-400 hover:text-red-400 text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Điểm Về 0
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateRandomPlayerCodes}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sinh Mã Mới 4 Thí Sinh
          </Button>
        </div>
      </div>

      {/* KHU VỰC 1: MẬT KHẨU MC SỬ DỤNG LÂU DÀI */}
      <div className="bg-[#0b1329] border-2 border-blue-900 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white">MẬT KHẨU QUẢN TRỊ MC (LƯU LÂU DÀI)</h2>
              <p className="text-xs text-slate-400 font-medium">Dùng để đăng nhập vào Bảng điều khiển trận đấu</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleGenerateRandomAdminPass}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sinh Mật Khẩu MC Mới
            </Button>
          </div>
        </div>

        {isEditingAdminPass ? (
          <div className="flex flex-wrap items-center gap-3 bg-[#060a14] p-3 rounded-xl border border-blue-900">
            <input
              type="text"
              value={tempAdminPass}
              onChange={(e) => setTempAdminPass(e.target.value)}
              placeholder="Nhập mật khẩu MC mới..."
              className="flex-1 min-w-[200px] bg-[#0b1329] border border-slate-700 rounded-lg px-4 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500 uppercase"
            />
            <Button
              size="sm"
              onClick={handleSaveAdminPass}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Mật Khẩu Lâu Dài
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
          <div className="flex flex-wrap items-center justify-between bg-[#060a14] p-4 rounded-xl border border-blue-950 gap-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">MẬT KHẨU HIỆN TẠI:</span>
                <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
                  {showAdminPass ? currentAdminPass : "••••••••••••"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                title={showAdminPass ? "Ẩn" : "Hiện"}
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <Button
                size="sm"
                onClick={handleCopyAdminPass}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer"
              >
                {copiedAdminPass ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Mật Khẩu MC
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
                className="border-slate-800 text-slate-300 text-xs h-9"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Sửa
              </Button>
            </div>
          </div>
        )}

        {adminPassSavedAlert && (
          <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60 text-center animate-in fade-in">
            Đã lưu mật khẩu MC mới thành công! Bạn có thể sử dụng mật khẩu này để đăng nhập lâu dài.
          </p>
        )}
      </div>

      {/* KHU VỰC 2: 4 THẺ MÃ BẢO MẬT 4 MÁY THÍ SINH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {matchState.players.map((player) => {
          const code = player.pin_code || `${player.slot_number}${player.slot_number}${player.slot_number}${player.slot_number}`;
          const isEditing = editingSlot === player.slot_number;

          return (
            <Card key={player.slot_number} className="border-2 border-blue-900/60 bg-[#0b1329] shadow-lg flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-blue-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-base text-white">
                      {player.slot_number}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-white uppercase">
                        MÁY THI ĐẤU {player.slot_number}
                      </CardTitle>
                      <span className="text-[11px] text-slate-400 font-mono">SLOT_{player.slot_number}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">ĐIỂM SỐ</span>
                    <span className="font-mono text-xl font-black text-amber-400">{player.score}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <div className="space-y-2 p-3 bg-[#060a14] rounded-xl border border-blue-900">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-bold">HỌ VÀ TÊN:</label>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-[#0b1329] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-bold">TRƯỜNG / ĐƠN VỊ:</label>
                      <input
                        type="text"
                        value={tempSchool}
                        onChange={(e) => setTempSchool(e.target.value)}
                        className="w-full bg-[#0b1329] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSlot(null)}
                        className="text-xs h-8 text-slate-400 hover:text-white"
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePlayer(player.slot_number)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-bold"
                      >
                        Lưu Thay Đổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-[#060a14] rounded-xl border border-blue-950">
                    <div>
                      <div className="text-base font-bold text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.school_name || "Chưa cập nhật đơn vị"}</div>
                    </div>
                    <button
                      onClick={() => handleStartEdit(player.slot_number, player.name, player.school_name || "")}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Sửa thông tin thí sinh"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Mã Ngẫu Nhiên Chữ & Số */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="bg-[#060a14] border border-blue-900/80 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      MÃ BẢO MẬT (CHỮ & SỐ)
                    </span>
                    <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                      {code}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(player.slot_number, code)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer"
                    >
                      {copiedSlot === player.slot_number ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy Link!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Link TS {player.slot_number}
                        </>
                      )}
                    </Button>

                    <a
                      href={`/join?slot=${player.slot_number}&pin=${code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
                    >
                      Vào máy bằng mã PIN này <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}