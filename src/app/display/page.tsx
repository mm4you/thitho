"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Trophy, Zap, Check, X, Volume2, VolumeX } from "lucide-react";

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const slotThemes = [
    { name: "DO", border: "border-red-500", bg: "bg-red-950/40", badge: "bg-red-600" },
    { name: "XANH", border: "border-blue-500", bg: "bg-blue-950/40", badge: "bg-blue-600" },
    { name: "VANG", border: "border-amber-500", bg: "bg-amber-950/40", badge: "bg-amber-600" },
    { name: "LUC", border: "border-emerald-500", bg: "bg-emerald-950/40", badge: "bg-emerald-600" },
  ];

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next > 0 && next <= 5) sound.playTick();
          else if (next === 0) {
            sound.playTimeUp();
            setIsTimerActive(false);
          }
          return Math.max(0, next);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeLeft]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
        setTimeLeft(event.state.time_left);
        setIsTimerActive(event.state.is_timer_running);
      } else if (event.type === "TOGGLE_STANDBY") {
        setMatchState((prev) => ({ ...prev, is_standby: event.is_standby }));
      } else if (event.type === "START_TIMER") {
        setTimeLimit(event.time_limit);
        setTimeLeft(event.time_limit);
        setIsTimerActive(true);
        sound.playTick();
        setMatchState((prev) => ({
          ...prev,
          is_standby: false,
          is_timer_running: true,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
          current_responses: {},
        }));
      } else if (event.type === "SUBMIT_ANSWER") {
        // Cap nhat Realtime trang thai nop bai cua thi sinh ngay tren man hinh chieu
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
      } else if (event.type === "LOCK_ANSWERS") {
        setIsTimerActive(false);
        sound.playTimeUp();
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        sound.playReveal();
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        let hasCorrect = false;
        const updatedPlayers = matchState.players.map((p) => {
          const res = event.results[p.slot_number];
          if (res?.is_correct) hasCorrect = true;
          return res ? { ...p, score: p.score + res.points_awarded } : p;
        });

        const updatedResponses = { ...matchState.current_responses };
        Object.keys(event.results).forEach((k) => {
          const slot = Number(k);
          if (updatedResponses[slot]) {
            updatedResponses[slot].is_correct = event.results[slot].is_correct;
            updatedResponses[slot].points_awarded = event.results[slot].points_awarded;
          }
        });

        if (hasCorrect) {
          sound.playCorrect();
          confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
        } else {
          sound.playWrong();
        }

        setMatchState((prev) => ({
          ...prev,
          is_scored: true,
          players: updatedPlayers,
          current_responses: updatedResponses,
        }));
      } else if (event.type === "PRESS_BUZZER") {
        sound.playBuzzer();
        setMatchState((prev) => {
          if (!prev.buzzer_winner_slot) {
            return {
              ...prev,
              buzzer_winner_slot: event.slot_number,
              buzzer_winner_time_ms: event.press_time_ms,
            };
          }
          return prev;
        });
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null, buzzer_winner_time_ms: null }));
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, score: p.score + event.delta } : p
          ),
        }));
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
        const round = matchState.rounds[event.round_index] || matchState.rounds[0];
        const question = round.questions[event.question_index] || round.questions[0];
        const newLimit = question?.time_limit || 15;
        setTimeLimit(newLimit);
        setTimeLeft(newLimit);
        setIsTimerActive(false);

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
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  // 1. MAN HINH CHO SAN KHAU
  if (matchState.is_standby) {
    return (
      <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-8 md:p-12 font-sans select-none relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-blue-900/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-wide uppercase text-white">
                DAU TRI ARENA
              </h1>
              <p className="text-sm font-semibold tracking-wider text-blue-300">
                CHUNG KET TRUC TIEP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-blue-950 border border-blue-800 text-slate-300 hover:text-white"
              title={isMuted ? "Bat am thanh" : "Tat am thanh"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="px-5 py-2 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 font-bold text-sm tracking-wider uppercase">
              {currentRound?.title || "VONG 1: KHOI DONG"}
            </div>
          </div>
        </div>

        {/* 4 Contestants Podiums */}
        <div className="my-auto py-8">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
              BANG DIEM 4 THI SINH
            </h2>
            <p className="text-base font-medium text-slate-400">
              Cac thi sinh san sang buoc vao phan thi tiep theo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {matchState.players.map((player, idx) => {
              const theme = slotThemes[idx] || slotThemes[0];
              return (
                <div
                  key={player.slot_number}
                  className={`border-2 ${theme.border} ${theme.bg} rounded-2xl p-6 text-center shadow-2xl flex flex-col justify-between transform transition-all`}
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-xl ${theme.badge} mx-auto flex items-center justify-center font-black text-xl text-white shadow-md`}>
                      {player.slot_number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white line-clamp-1">
                        {player.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-300 line-clamp-1 mt-0.5">
                        {player.school_name || "Thi sinh"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/10">
                    <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block mb-1">
                      DIEM SO
                    </span>
                    <span className="font-mono text-5xl font-black text-amber-400 tracking-tight">
                      {player.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-blue-900/60 pt-6 flex items-center justify-between text-sm font-semibold text-slate-400">
          <span>HE THONG THI DAU OLYMPIA TRUC TIEP</span>
          <span className="text-amber-400">MC DANG DIEU PHOI TRAN DAU</span>
        </div>
      </div>
    );
  }

  // 2. MAN HINH THI DAU
  const timerPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-8 font-sans select-none relative overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b-2 border-blue-900/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 rounded-lg bg-blue-600 font-black text-sm uppercase">
            {currentRound?.title}
          </div>
          <span className="text-xl font-bold text-slate-200">
            Cau so {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-blue-950 border border-blue-800 text-slate-300 hover:text-white"
            title={isMuted ? "Bat am thanh" : "Tat am thanh"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {matchState.buzzer_winner_slot && (
            <div className="px-6 py-2 rounded-xl bg-amber-500 text-black font-black text-base flex items-center gap-2 animate-bounce">
              <Zap className="w-5 h-5 fill-current" />
              THI SINH {matchState.buzzer_winner_slot} GIANG QUYEN! ({(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s)
            </div>
          )}
        </div>
      </div>

      {/* Center Question & Timer */}
      <div className="my-auto py-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Timer Radial */}
        <div className="flex justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "stroke-red-500" : "stroke-amber-400"}`}
                strokeWidth="8"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * timerPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className={`absolute font-mono text-4xl font-black ${timeLeft <= 5 ? "text-red-400 animate-ping" : "text-white"}`}>
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Big Question Box */}
        <div className="bg-[#0b1329] border-2 border-blue-800/80 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-6">
          <h2 className="text-3xl md:text-4xl font-black text-white leading-relaxed tracking-wide">
            {currentQuestion?.question_text}
          </h2>

          {/* Multiple choice options */}
          {currentQuestion?.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 font-bold text-lg transition-all ${
                    matchState.is_revealed && opt.startsWith(currentQuestion.correct_answer[0])
                      ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-4 ring-emerald-500/40"
                      : "bg-[#070c1a] border-blue-900/80 text-slate-200"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {/* Reveal Correct Answer */}
          {matchState.is_revealed && (
            <div className="p-5 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 text-center animate-in fade-in">
              <span className="text-xs uppercase font-bold text-emerald-400 block mb-1">
                DAP AN CHINH XAC:
              </span>
              <span className="text-2xl md:text-3xl font-black text-emerald-200">
                {currentQuestion?.correct_answer}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Contestants Live Podiums & Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {matchState.players.map((player, idx) => {
          const theme = slotThemes[idx] || slotThemes[0];
          const resp = matchState.current_responses[player.slot_number];
          const isRevealed = matchState.is_revealed;
          const isCorrect = resp?.is_correct === true;
          const isWrong = resp?.is_correct === false;

          return (
            <div
              key={player.slot_number}
              className={`border-2 ${
                isRevealed && isCorrect
                  ? "border-emerald-400 bg-emerald-950/60 ring-4 ring-emerald-500/40"
                  : isRevealed && isWrong
                  ? "border-red-500 bg-red-950/60"
                  : theme.border + " " + theme.bg
              } rounded-2xl p-4 transition-all flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-white line-clamp-1">
                  {player.slot_number}. {player.name}
                </span>
                <span className="font-mono text-lg font-black text-amber-400">
                  {player.score} d
                </span>
              </div>

              <div className="h-16 rounded-xl bg-[#040711] border border-white/10 flex items-center justify-center px-4 text-center">
                {!isRevealed ? (
                  resp ? (
                    <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-black text-xs uppercase tracking-wider animate-pulse">
                      DA NOP ({(resp.response_time_ms / 1000).toFixed(2)}s)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                      DANG SUY NGHI...
                    </span>
                  )
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-base uppercase text-white line-clamp-1">
                      {resp ? resp.answer_text : "(Khong nop)"}
                    </span>
                    {isCorrect && <Check className="w-6 h-6 text-emerald-400 shrink-0 ml-1 stroke-[3]" />}
                    {isWrong && <X className="w-6 h-6 text-red-400 shrink-0 ml-1 stroke-[3]" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
