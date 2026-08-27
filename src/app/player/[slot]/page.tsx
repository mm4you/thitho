"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Send, Lock, CheckCircle2, Clock, Edit2, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlayerPage() {
  const params = useParams();
  const slotNumber = Number(params.slot) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [inputText, setInputText] = useState<string>("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [submittedTime, setSubmittedTime] = useState<number | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<number>(Date.now());
  const [buzzerPressed, setBuzzerPressed] = useState<boolean>(false);

  // Modal Custom Tên
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("");
  const [customSchool, setCustomSchool] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlayer = matchState.players.find((p) => p.slot_number === slotNumber) || {
    slot_number: slotNumber,
    name: `Thí sinh ${slotNumber}`,
    score: 0,
    school_name: "Thí sinh",
  };

  useEffect(() => {
    setCustomName(currentPlayer.name);
    setCustomSchool(currentPlayer.school_name || "");
  }, [currentPlayer.name, currentPlayer.school_name]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "START_TIMER") {
        setTimerStartTime(Date.now());
        setSubmittedAnswer("");
        setSubmittedTime(null);
        setInputText("");
        setBuzzerPressed(false);
        setMatchState((prev) => ({
          ...prev,
          is_timer_running: true,
          time_left: event.time_limit,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
        }));
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (event.type === "LOCK_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            return res ? { ...p, score: p.score + res.points_awarded } : p;
          });
          return { ...prev, is_scored: true, players: updatedPlayers };
        });
      } else if (event.type === "RESET_BUZZER") {
        setBuzzerPressed(false);
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null }));
      } else if (event.type === "UPDATE_PLAYER_INFO") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number
              ? { ...p, name: event.name, school_name: event.school_name }
              : p
          ),
        }));
      } else if (event.type === "CHANGE_QUESTION") {
        setSubmittedAnswer("");
        setSubmittedTime(null);
        setInputText("");
        setBuzzerPressed(false);
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
        }));
      }
    });

    return () => unsubscribe();
  }, [slotNumber]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const handleSubmitAnswer = (answer: string) => {
    if (!answer.trim() || matchState.is_locked) return;
    const timeMs = Math.max(50, Date.now() - timerStartTime);

    setSubmittedAnswer(answer.trim());
    setSubmittedTime(timeMs);

    sendGameEvent({
      type: "SUBMIT_ANSWER",
      slot_number: slotNumber,
      answer_text: answer.trim(),
      response_time_ms: timeMs,
    });
  };

  const handlePressBuzzer = () => {
    if (buzzerPressed || matchState.buzzer_winner_slot || matchState.is_locked) return;
    const timeMs = Math.max(50, Date.now() - timerStartTime);
    setBuzzerPressed(true);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200);
    }

    sendGameEvent({
      type: "PRESS_BUZZER",
      slot_number: slotNumber,
      press_time_ms: timeMs,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slotNumber
        ? { ...p, name: customName.trim(), school_name: customSchool.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: slotNumber,
      name: customName.trim(),
      school_name: customSchool.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 max-w-md mx-auto font-sans select-none relative">
      {/* Modal Đổi Tên Thí Sinh */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Đổi Tên Thí Sinh {slotNumber}</CardTitle>
              <button onClick={() => setIsEditingProfile(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Họ và tên của bạn:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Trường / Đơn vị:</label>
                  <input
                    type="text"
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
                <Button type="submit" className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-bold h-9">
                  Lưu & Hiển Thị Lên Màn Hình
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Header Card */}
      <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-lg text-zinc-100">
              {slotNumber}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-sm text-zinc-100 line-clamp-1">{currentPlayer.name}</h1>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  title="Đổi tên của bạn"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-zinc-500">{currentPlayer.school_name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 block">ĐIỂM SỐ</span>
            <span className="font-mono text-xl font-bold text-amber-400">{currentPlayer.score}</span>
          </div>
        </CardContent>
      </Card>

      <div className="my-3 flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>{currentRound?.title}</span>
        <span>Câu {matchState.current_question_index + 1}</span>
      </div>

      {/* Main Interaction */}
      <main className="flex-1 flex flex-col justify-center my-2 gap-4">
        {currentQuestion?.question_type === "buzzer" ? (
          <div className="flex flex-col items-center justify-center gap-4 my-auto">
            <button
              onClick={handlePressBuzzer}
              disabled={!!matchState.buzzer_winner_slot || matchState.is_locked}
              className={`w-56 h-56 rounded-full border flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl ${
                matchState.buzzer_winner_slot === slotNumber
                  ? "bg-amber-500 border-amber-400 text-zinc-950 scale-105"
                  : matchState.buzzer_winner_slot
                  ? "bg-zinc-900 border-zinc-800 text-zinc-600 opacity-40 cursor-not-allowed"
                  : "bg-zinc-100 border-zinc-200 text-zinc-950 hover:bg-zinc-200"
              }`}
            >
              <Zap className="w-14 h-14 mb-2 fill-current" />
              <span className="text-xl font-bold tracking-tight">
                {matchState.buzzer_winner_slot === slotNumber ? "ĐÃ GIÀNH QUYỀN!" : "BẤM CHUÔNG"}
              </span>
            </button>
          </div>
        ) : currentQuestion?.question_type === "multiple_choice" ? (
          <div className="grid grid-cols-2 gap-3 my-auto">
            {["A", "B", "C", "D"].map((choice) => {
              const isSelected = submittedAnswer.startsWith(choice);
              return (
                <button
                  key={choice}
                  disabled={matchState.is_locked}
                  onClick={() => handleSubmitAnswer(choice)}
                  className={`h-24 rounded-xl font-bold text-2xl flex flex-col items-center justify-center transition-all border active:scale-98 ${
                    isSelected
                      ? "bg-zinc-100 border-zinc-100 text-zinc-950 shadow"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span>{choice}</span>
                  {isSelected && <span className="text-[10px] font-medium opacity-80">ĐÃ CHỌN</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 my-auto">
            <label className="text-xs font-semibold text-zinc-400">
              Nhập Câu Trả Lời:
            </label>
            <input
              ref={inputRef}
              type="text"
              disabled={matchState.is_locked}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitAnswer(inputText);
              }}
              placeholder="Gõ đáp án tại đây..."
              className="w-full h-14 rounded-xl bg-zinc-900 border border-zinc-800 px-4 text-lg font-bold text-zinc-100 uppercase placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <Button
              disabled={!inputText.trim() || matchState.is_locked}
              onClick={() => handleSubmitAnswer(inputText)}
              className="w-full h-12 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-sm gap-2"
            >
              <Send className="w-4 h-4" /> Gửi Đáp Án
            </Button>
          </div>
        )}

        {/* Status Card */}
        <Card className="border-zinc-800 bg-zinc-900/40 text-center">
          <CardContent className="p-4">
            {submittedAnswer ? (
              <div className="space-y-1">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                  Đã Gửi Đáp Án
                </Badge>
                <div className="text-lg font-bold text-zinc-100 uppercase">{submittedAnswer}</div>
                {submittedTime && (
                  <div className="text-xs font-mono text-zinc-500">
                    Thời gian: {(submittedTime / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            ) : matchState.is_locked ? (
              <div className="text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Đã Hết Giờ
              </div>
            ) : (
              <span className="text-xs text-zinc-600 italic">Đang chờ bạn gửi đáp án...</span>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-[11px] text-zinc-600 py-2">
        Thí Sinh {slotNumber} • Nhấn vào tên để đổi tên hiển thị
      </footer>
    </div>
  );
}