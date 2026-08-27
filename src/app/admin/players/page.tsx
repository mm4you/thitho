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
  Edit2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

  const handleGenerateRandomCodes = () => {
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
    if (confirm("Ban co chac muon dat lai diem 4 thi sinh ve 0?")) {
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
            QUAN LY KET NOI 4 THI SINH
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Cap ma bao mat ngau nhien gom chu va so, link ket noi truc tiep cho tung may
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetScores}
            className="border-zinc-800 text-slate-400 hover:text-red-400 text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Diem Ve 0
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateRandomCodes}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sinh Ma Ngau Nhien (Chu & So)
          </Button>
        </div>
      </div>

      {/* 4 Player Cards */}
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
                        MAY THI DAU {player.slot_number}
                      </CardTitle>
                      <span className="text-[11px] text-slate-400 font-mono">SLOT_{player.slot_number}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">DIEM SO</span>
                    <span className="font-mono text-xl font-black text-amber-400">{player.score}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <div className="space-y-2 p-3 bg-[#060a14] rounded-xl border border-blue-900">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-bold">HO VA TEN:</label>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-[#0b1329] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-bold">TRUONG / DON VI:</label>
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
                        Huy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePlayer(player.slot_number)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-bold"
                      >
                        Luu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-[#060a14] rounded-xl border border-blue-950">
                    <div>
                      <div className="text-base font-bold text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.school_name || "Chua cap nhat don vi"}</div>
                    </div>
                    <button
                      onClick={() => handleStartEdit(player.slot_number, player.name, player.school_name || "")}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Sua thong tin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Ma Chu & So */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="bg-[#060a14] border border-blue-900/80 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      MA KET NOI (CHU & SO)
                    </span>
                    <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                      {code}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(player.slot_number, code)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 gap-1.5"
                    >
                      {copiedSlot === player.slot_number ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Da Copy Link!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Link TS {player.slot_number}
                        </>
                      )}
                    </Button>

                    <a
                      href={`/player/${player.slot_number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
                    >
                      Mo may truc tiep <ExternalLink className="w-3 h-3" />
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
