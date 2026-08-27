"use client";

import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Volume2, VolumeX, Maximize, Award, Sparkles, CheckCircle2, XCircle } from "lucide-react";

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe realtime events
  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
        setTimeLeft(event.state.time_left);
        setTimerRunning(event.state.is_timer_running);
      } else if (event.type === "START_TIMER") {
        setTimeLeft(event.time_limit);
        setTimerRunning(true);
        if (soundEnabled) sound.playTick();
      } else if (event.type === "PAUSE_TIMER") {
        setTimerRunning(false);
      } else if (event.type === "LOCK_ANSWERS") {
        setTimerRunning(false);
        setMatchState((prev) => ({ ...prev, is_locked: true }));
        if (soundEnabled) sound.playTimeUp();
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
        if (soundEnabled) sound.playReveal();
      } else if (event.type === "SUBMIT_ANSWER") {
        setMatchState((prev) => ({
          ...prev,
          current_responses: {
            ...prev.current_responses,
            [event.slot_number]: {
              slot_number: event.slot_number,
              answer_text: event.answer_text,
              response_time_ms: event.response_time_ms,
            },
          },
        }));
      } else if (event.type === "PRESS_BUZZER") {
        setMatchState((prev) => {
          if (!prev.buzzer_winner_slot) {
            if (soundEnabled) sound.playBuzzer();
            return {
              ...prev,
              buzzer_winner_slot: event.slot_number,
              buzzer_winner_time_ms: event.press_time_ms,
            };
          }
          return prev;
        });
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({
          ...prev,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
        }));
      } else if (event.type === "GRADE_ANSWERS") {
        if (soundEnabled) sound.playCorrect();
        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            if (res) {
              return { ...p, score: p.score + res.points_awarded };
            }
            return p;
          });

          const updatedResponses = { ...prev.current_responses };
          Object.keys(event.results).forEach((k) => {
            const slot = Number(k);
            if (updatedResponses[slot]) {
              updatedResponses[slot].is_correct = event.results[slot].is_correct;
              updatedResponses[slot].points_awarded = event.results[slot].points_awarded;
            }
          });

          return {
            ...prev,
            is_scored: true,
            players: updatedPlayers,
            current_responses: updatedResponses,
          };
        });
      } else if (event.type === "PLAY_SFX") {
        if (soundEnabled) {
          if (event.sfx === "correct") sound.playCorrect();
          if (event.sfx === "wrong") sound.playWrong();
          if (event.sfx === "buzzer") sound.playBuzzer();
          if (event.sfx === "tick") sound.playTick();
          if (event.sfx === "timeup") sound.playTimeUp();
          if (event.sfx === "reveal") sound.playReveal();
          if (event.sfx === "victory") {
            sound.playVictory();
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          }
        }
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, score: p.score + event.delta } : p
          ),
        }));
      } else if (event.type === "CHANGE_QUESTION") {
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
          current_responses: {},
        }));
      }
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  // Local Timer countdown loop
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (soundEnabled) sound.playTimeUp();
            return 0;
          }
          if (soundEnabled && prev <= 5) sound.playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timeLeft, soundEnabled]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="h-screen w-screen bg-[#040814] text-slate-100 flex flex-col justify-between p-4 md:p-6 select-none relative overflow-hidden font-sans">
      {/* Background Lighting Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR: Header, Round Title & Controls */}
      <header className="relative z-10 flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400">
              {matchState.title}
            </h1>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
              {currentRound?.title} • CÂU HỎI {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                : "bg-slate-800/40 border-slate-700 text-slate-500"
            }`}
            title="Bật/Tắt âm thanh"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Toàn màn hình"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CENTER: Main Question Arena & Countdown Timer */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center max-w-6xl w-full mx-auto gap-6">
        {/* Buzzer Alert Banner (nếu có người bấm chuông) */}
        {matchState.buzzer_winner_slot && (
          <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-1 rounded-2xl shadow-[0_0_50px_rgba(255,209,102,0.6)] animate-bounce">
            <div className="bg-slate-950 py-3 px-6 rounded-xl flex items-center justify-center gap-4 text-center">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="text-xl md:text-2xl font-black text-amber-300 tracking-wide">
                🔔 THÍ SINH {matchState.buzzer_winner_slot} (
                {matchState.players.find((p) => p.slot_number === matchState.buzzer_winner_slot)?.name}) GIÀNH QUYỀN TRẢ LỜI!
              </span>
              <span className="text-sm font-mono text-slate-400">
                ({(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s)
              </span>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="w-full glass-panel rounded-3xl p-6 md:p-8 border border-blue-500/30 relative shadow-2xl flex flex-col md:flex-row gap-6 items-center">
          {/* Circular Countdown Clock */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            <svg className="w-28 h-28 md:w-36 md:h-36 transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                className="stroke-blue-950/80 fill-none"
                strokeWidth="10"
              />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                className={`fill-none transition-all duration-1000 ${
                  timeLeft <= 5 ? "stroke-red-500" : "stroke-amber-400"
                }`}
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * timeLeft) / (currentQuestion?.time_limit || 15)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl md:text-5xl font-black font-mono tracking-tight ${
                  timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-amber-300"
                }`}
              >
                {timeLeft}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">GIÂY</span>
            </div>
          </div>

          {/* Question Text & Media */}
          <div className="flex-1 text-left">
            <div className="inline-block px-3 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-500/40">
              +{currentQuestion?.points_correct} ĐIỂM
            </div>
            <h2 className="text-xl md:text-3xl font-extrabold text-slate-100 leading-snug tracking-wide">
              {currentQuestion?.question_text || "Đang chuẩn bị câu hỏi..."}
            </h2>

            {/* Options List (nếu là trắc nghiệm) */}
            {currentQuestion?.question_type === "multiple_choice" && currentQuestion.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                {currentQuestion.options.map((opt, i) => {
                  const isCorrect = matchState.is_revealed && opt.startsWith(currentQuestion.correct_answer[0]);
                  return (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl text-base md:text-lg font-semibold transition-all border ${
                        isCorrect
                          ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 glow-green"
                          : "bg-slate-900/60 border-slate-700/80 text-slate-300"
                      }`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Correct Answer Reveal Banner */}
            {matchState.is_revealed && currentQuestion?.question_type !== "multiple_choice" && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold">ĐÁP ÁN CHUẨN:</span>
                <span className="text-lg font-black uppercase text-white tracking-wider">
                  {currentQuestion?.correct_answer}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Contestants Live Answer Flip Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            const hasSubmitted = !!resp;
            const isRevealed = matchState.is_revealed;
            const isScored = matchState.is_scored;
            const isCorrect = resp?.is_correct;

            return (
              <div
                key={player.slot_number}
                className={`glass-panel rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between ${
                  isScored && resp
                    ? isCorrect
                      ? "border-emerald-400/80 bg-emerald-950/40 glow-green"
                      : "border-red-500/80 bg-red-950/40 glow-red"
                    : matchState.buzzer_winner_slot === player.slot_number
                    ? "border-amber-400 bg-amber-950/50 glow-gold"
                    : hasSubmitted
                    ? "border-blue-400/60 bg-blue-950/30"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                {/* Header Thí Sinh */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xs font-black text-blue-300">
                      {player.slot_number}
                    </div>
                    <span className="font-bold text-sm text-slate-200 line-clamp-1">{player.name}</span>
                  </div>
                  {resp && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {(resp.response_time_ms / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>

                {/* Khung Hiển Thị Đáp Án (Flip Card) */}
                <div className="my-2 h-20 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden">
                  {!hasSubmitted ? (
                    <span className="text-xs text-slate-500 italic animate-pulse">Đang suy nghĩ...</span>
                  ) : !isRevealed ? (
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                      ĐÃ GỬI ĐÁP ÁN (ĐÃ KHÓA)
                    </div>
                  ) : (
                    <div className="animate-flip w-full flex flex-col items-center justify-center">
                      <span className="text-lg md:text-xl font-black text-white uppercase tracking-wider line-clamp-2">
                        {resp.answer_text}
                      </span>
                    </div>
                  )}

                  {/* Icon Đúng / Sai khi đã chấm điểm */}
                  {isScored && resp && (
                    <div className="absolute top-1 right-1">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Điểm Thưởng / Kết quả */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Tổng điểm:</span>
                  <span className="font-mono font-black text-base text-amber-300">{player.score} đ</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* BOTTOM SCOREBOARD: 4 Cột Điểm Đổi Hạng Hoành Tráng */}
      <footer className="relative z-10 pt-2">
        <div className="grid grid-cols-4 gap-3 max-w-6xl mx-auto">
          {matchState.players.map((p, idx) => (
            <div
              key={p.slot_number}
              className="bg-slate-900/80 border border-blue-900/60 rounded-xl p-2.5 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                <span className="text-xs md:text-sm font-semibold text-slate-200 line-clamp-1">{p.name}</span>
              </div>
              <span className="font-mono text-lg md:text-xl font-black text-amber-400">{p.score}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
