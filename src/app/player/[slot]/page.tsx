"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Send, Lock, CheckCircle2, Clock } from "lucide-react";

export default function PlayerPage() {
  const params = useParams();
  const slotNumber = Number(params.slot) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [inputText, setInputText] = useState<string>("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [submittedTime, setSubmittedTime] = useState<number | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<number>(Date.now());
  const [buzzerPressed, setBuzzerPressed] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

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

  const currentPlayer = matchState.players.find((p) => p.slot_number === slotNumber) || {
    slot_number: slotNumber,
    name: `Thí sinh ${slotNumber}`,
    score: 0,
    school_name: "Thí sinh",
  };

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

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col justify-between p-4 max-w-lg mx-auto font-sans select-none">
      <header className="glass-panel rounded-2xl p-4 border border-blue-500/30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black text-xl text-white shadow-lg">
            {slotNumber}
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-100 line-clamp-1">{currentPlayer.name}</h1>
            <span className="text-xs text-blue-400 font-semibold">{currentPlayer.school_name}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ĐIỂM SỐ</span>
          <span className="font-mono text-2xl font-black text-amber-300">{currentPlayer.score}</span>
        </div>
      </header>

      <div className="my-3 py-2 px-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs">
        <span className="text-blue-300 font-semibold">{currentRound?.title}</span>
        <span className="text-slate-400">Câu {matchState.current_question_index + 1}</span>
      </div>

      <main className="flex-1 flex flex-col justify-center my-2 gap-4">
        {currentQuestion?.question_type === "buzzer" ? (
          <div className="flex flex-col items-center justify-center gap-4 my-auto">
            <button
              onClick={handlePressBuzzer}
              disabled={!!matchState.buzzer_winner_slot || matchState.is_locked}
              className={`w-60 h-60 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 transform active:scale-95 shadow-2xl ${
                matchState.buzzer_winner_slot === slotNumber
                  ? "bg-gradient-to-tr from-amber-500 to-yellow-400 border-amber-200 text-slate-950 glow-gold animate-pulse scale-105"
                  : matchState.buzzer_winner_slot
                  ? "bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed"
                  : "bg-gradient-to-tr from-rose-600 to-red-500 border-rose-400 text-white glow-red hover:scale-105"
              }`}
            >
              <Zap className="w-16 h-16 mb-2 fill-current" />
              <span className="text-2xl font-black tracking-wider">
                {matchState.buzzer_winner_slot === slotNumber ? "ĐÃ GIÀNH QUYỀN!" : "BẤM CHUÔNG"}
              </span>
            </button>
          </div>
        ) : currentQuestion?.question_type === "multiple_choice" ? (
          <div className="grid grid-cols-2 gap-3.5 my-auto">
            {["A", "B", "C", "D"].map((choice) => {
              const isSelected = submittedAnswer.startsWith(choice);
              return (
                <button
                  key={choice}
                  disabled={matchState.is_locked}
                  onClick={() => handleSubmitAnswer(choice)}
                  className={`h-28 rounded-2xl font-black text-2xl flex flex-col items-center justify-center transition-all border-2 active:scale-95 shadow-xl ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white glow-blue scale-105"
                      : "bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800"
                  }`}
                >
                  <span className="text-3xl">{choice}</span>
                  {isSelected && <span className="text-[11px] font-normal mt-1 opacity-90">ĐÃ CHỌN</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 my-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
              className="w-full h-16 rounded-2xl bg-slate-900 border-2 border-blue-500/40 px-5 text-xl font-bold text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-400 focus:glow-blue"
            />
            <button
              disabled={!inputText.trim() || matchState.is_locked}
              onClick={() => handleSubmitAnswer(inputText)}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-98"
            >
              <Send className="w-5 h-5" /> GỬI ĐÁP ÁN
            </button>
          </div>
        )}

        <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-center">
          {submittedAnswer ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> ĐÃ GỬI ĐÁP ÁN:
              </div>
              <span className="text-xl font-black text-white uppercase">{submittedAnswer}</span>
              {submittedTime && (
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Thời gian: {(submittedTime / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          ) : matchState.is_locked ? (
            <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-sm">
              <Lock className="w-4 h-4" /> ĐÃ HẾT THỜI GIAN
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">Đang chờ bạn gửi đáp án...</span>
          )}
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-600 py-1">
        Máy Thí Sinh {slotNumber} • Kết Nối Realtime
      </footer>
    </div>
  );
}
