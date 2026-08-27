"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState } from "@/types/game";
import { ArrowLeft, Save, Plus, Trash2, Users, HelpCircle, Play } from "lucide-react";

export default function AdminSettingsPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    saveMatchStateLocally(matchState);
    sendGameEvent({ type: "SYNC_STATE", state: matchState });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetScores = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại điểm của cả 4 thí sinh về 0?")) {
      const updated = {
        ...matchState,
        players: matchState.players.map((p) => ({ ...p, score: 0 })),
        current_responses: {},
        is_locked: false,
        is_revealed: false,
        is_scored: false,
        buzzer_winner_slot: null,
      };
      setMatchState(updated);
      saveMatchStateLocally(updated);
      sendGameEvent({ type: "SYNC_STATE", state: updated });
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 p-4 md:p-8 font-sans max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Cấu Hình Trận Đấu & Câu Hỏi</h1>
            <p className="text-xs text-slate-400">Tùy chỉnh tên thí sinh, ngân hàng câu hỏi các vòng</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetScores}
            className="px-4 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-600/30"
          >
            Reset Điểm Về 0
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" /> {savedSuccess ? "Đã Lưu!" : "Lưu Thay Đổi"}
          </button>
          <Link
            href="/admin/live"
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" /> Vào Trận Đấu
          </Link>
        </div>
      </div>

      {/* 1. THÔNG TIN 4 THÍ SINH */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Danh Sách 4 Thí Sinh
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchState.players.map((p, idx) => (
            <div key={p.slot_number} className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
              <div className="text-xs font-bold text-blue-400 mb-2 uppercase">Thí sinh Vị trí {p.slot_number}</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => {
                    const newPlayers = [...matchState.players];
                    newPlayers[idx].name = e.target.value;
                    setMatchState({ ...matchState, players: newPlayers });
                  }}
                  placeholder="Tên thí sinh..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={p.school_name}
                  onChange={(e) => {
                    const newPlayers = [...matchState.players];
                    newPlayers[idx].school_name = e.target.value;
                    setMatchState({ ...matchState, players: newPlayers });
                  }}
                  placeholder="Trường / Đơn vị..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CÂU HỎI THEO VÒNG */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          Ngân Hàng Câu Hỏi Theo Vòng
        </h2>

        <div className="space-y-6">
          {matchState.rounds.map((round, rIdx) => (
            <div key={round.id} className="bg-slate-900/60 rounded-xl p-5 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base text-amber-300">{round.title}</h3>
                <span className="text-xs text-slate-400">{round.questions.length} câu hỏi</span>
              </div>

              <div className="space-y-3">
                {round.questions.map((q, qIdx) => (
                  <div key={q.id} className="bg-slate-950 rounded-lg p-3 border border-slate-850">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-blue-300">Câu {qIdx + 1} ({q.time_limit}s - {q.points_correct}đ)</span>
                      <span className="uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded">{q.question_type}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium mb-1.5">{q.question_text}</p>
                    <p className="text-xs text-emerald-400 font-bold">Đáp án: {q.correct_answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
