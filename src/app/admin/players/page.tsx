"use client";

import { useState, useEffect } from "react";
import {
  loadSavedMatchState,
  saveMatchStateLocally,
  sendGameEvent,
  subscribeToGameChannel,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Users,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  Edit2,
  Save,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminPlayersPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [tempName, setTempName] = useState<string>("");
  const [tempSchool, setTempSchool] = useState<string>("");
  const [originUrl, setOriginUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
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

  const handleGenerateRandomPins = () => {
    const updatedPlayers = matchState.players.map((p) => {
      const randPin = String(Math.floor(1000 + Math.random() * 9000));
      return { ...p, pin_code: randPin };
    });

    const newState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleCopyLink = (slot: number, pin: string) => {
    const joinUrl = `${originUrl || "http://localhost:3000"}/join?slot=${slot}&pin=${pin}`;
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            Quản Lý Kết Nối 4 Thí Sinh
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cấp mã PIN bí mật, tạo link kết nối và quản lý danh sách 4 máy thi đấu
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetScores}
            className="border-zinc-800 text-zinc-400 hover:text-red-400 text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Điểm Về 0
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateRandomPins}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Sinh Mã PIN Random Mới
          </Button>
        </div>
      </div>

      {/* 4 Player Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {matchState.players.map((player) => {
          const pin = player.pin_code || `${player.slot_number}${player.slot_number}${player.slot_number}${player.slot_number}`;
          const joinUrl = `${originUrl || "http://localhost:3000"}/join?slot=${player.slot_number}&pin=${pin}`;
          const isEditing = editingSlot === player.slot_number;

          return (
            <Card key={player.slot_number} className="border-zinc-800 bg-zinc-900/50 shadow-md flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-100">
                      {player.slot_number}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-zinc-100">
                        Vị Trí Máy {player.slot_number}
                      </CardTitle>
                      <span className="text-[11px] text-zinc-500 font-mono">SLOT_{player.slot_number}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">ĐIỂM SỐ</span>
                    <span className="font-mono text-lg font-bold text-amber-400">{player.score} đ</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Thông tin Thí sinh */}
                {isEditing ? (
                  <div className="space-y-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Họ & Tên:</label>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs font-semibold text-zinc-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Trường / Đơn vị:</label>
                      <input
                        type="text"
                        value={tempSchool}
                        onChange={(e) => setTempSchool(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSlot(null)}
                        className="text-xs h-7"
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePlayer(player.slot_number)}
                        className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs h-7 font-bold"
                      >
                        Lưu Thay Đổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-950/80 rounded-lg border border-zinc-850">
                    <div>
                      <div className="text-sm font-bold text-zinc-100">{player.name}</div>
                      <div className="text-xs text-zinc-400">{player.school_name || "Chưa cập nhật trường"}</div>
                    </div>
                    <button
                      onClick={() => handleStartEdit(player.slot_number, player.name, player.school_name || "")}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      title="Sửa tên thí sinh"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Mã PIN Bí Mật & Link */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                      MÃ PIN BÍ MẬT
                    </span>
                    <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                      {pin}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyLink(player.slot_number, pin)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-xs h-9 gap-1.5 font-semibold"
                    >
                      {copiedSlot === player.slot_number ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy Link!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Link Cho TS {player.slot_number}
                        </>
                      )}
                    </Button>

                    <a
                      href={`/player/${player.slot_number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1"
                    >
                      Mở giao diện máy này <ExternalLink className="w-3 h-3" />
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
