"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Check, X, Volume2, VolumeX, Maximize, Minimize, Home } from "lucide-react";

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const slotThemes = [
    { name: "ĐỎ", border: "border-red-500/80", accent: "text-red-400", badge: "bg-red-500/20 text-red-300 border-red-500/40" },
    { name: "XANH", border: "border-blue-500/80", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { name: "VÀNG", border: "border-amber-500/80", accent: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    { name: "LỤC", border: "border-emerald-500/80", accent: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  ];

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

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
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
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

  // 1. MÀN HÌNH CHỜ SÂN KHẤU: BẢNG ĐIỂM 4 THÍ SINH
  if (matchState.is_standby) {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-8 font-sans select-none">
        {/* Header Thanh Lịch */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </Link>
            <span className="text-lg font-bold tracking-tight text-white uppercase">
              {matchState.title || "ĐẤU TRÍ ARENA"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Âm thanh"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 4 Thí Sinh Thanh Tao */}
        <div className="my-auto py-6 max-w-6xl mx-auto w-full space-y-8">
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              BẢNG ĐIỂM THI ĐẤU
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {matchState.players.map((player, idx) => {
              const theme = slotThemes[idx] || slotThemes[0];
              return (
                <div
                  key={player.slot_number}
                  className={`bg-[#0d121f] border ${theme.border} rounded-2xl p-6 text-center flex flex-col justify-between h-[340px] shadow-sm`}
                >
                  <div className="space-y-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${theme.badge}`}>
                      VỊ TRÍ {player.slot_number}
                    </span>
                    <div>
                      <h3 className="text-2xl font-bold text-white line-clamp-2">
                        {player.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-400 line-clamp-1 mt-1">
                        {player.school_name || "Thí sinh"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800/80">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                      ĐIỂM SỐ
                    </span>
                    <span className="font-mono text-5xl font-black text-amber-400">
                      {player.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-xs text-slate-600 font-medium tracking-wider">
          CHỜ BẮT ĐẦU CÂU HỎI TIẾP THEO
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH THI ĐẤU
  const timerPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-6 md:p-8 font-sans select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1 text-xs font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </Link>
          <span className="text-sm font-bold text-slate-300">
            {currentRound?.title} • Câu {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Buzzer Alert */}
      {matchState.buzzer_winner_slot && (
        <div className="my-2 p-3 rounded-xl bg-amber-500 text-black font-bold text-center text-base flex items-center justify-center gap-2 animate-bounce shadow">
          <Zap className="w-5 h-5 fill-current" />
          THÍ SINH {matchState.buzzer_winner_slot} GIÀNH QUYỀN TRẢ LỜI! ({(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s)
        </div>
      )}

      {/* Trung Tâm: Câu Hỏi & Đồng Hồ */}
      <div className="my-auto py-4 max-w-5xl mx-auto w-full space-y-6">
        {/* Đồng Hồ Đếm Ngược Gọn Gàng */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" className="stroke-slate-800" strokeWidth="6" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "stroke-red-500" : "stroke-amber-400"}`}
                strokeWidth="6"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * timerPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className={`absolute font-mono text-3xl font-black ${timeLeft <= 5 ? "text-red-400" : "text-white"}`}>
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Khung Câu Hỏi Trang Nhã */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 md:p-10 text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
            {currentQuestion?.question_text}
          </h2>

          {/* 4 Đáp Án Trắc Nghiệm */}
          {currentQuestion?.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border font-semibold text-base transition-all ${
                    matchState.is_revealed && opt.startsWith(currentQuestion.correct_answer[0])
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "bg-[#070a12] border-slate-800 text-slate-200"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {/* Mở Đáp Án Đúng */}
          {matchState.is_revealed && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/80 text-center animate-in fade-in">
              <span className="text-[11px] uppercase font-bold text-emerald-400 block mb-0.5">
                ĐÁP ÁN ĐÚNG:
              </span>
              <span className="text-2xl font-bold text-emerald-200">
                {currentQuestion?.correct_answer}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Thí Sinh Dưới Cùng: Dễ Quan Sát */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {matchState.players.map((player, idx) => {
          const theme = slotThemes[idx] || slotThemes[0];
          const resp = matchState.current_responses[player.slot_number];
          const isRevealed = matchState.is_revealed;
          const isCorrect = resp?.is_correct === true;
          const isWrong = resp?.is_correct === false;

          return (
            <div
              key={player.slot_number}
              className={`border ${
                isRevealed && isCorrect
                  ? "border-emerald-500 bg-emerald-950/40"
                  : isRevealed && isWrong
                  ? "border-red-500 bg-red-950/40"
                  : theme.border + " bg-[#0d121f]"
              } rounded-xl p-4 transition-all flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white line-clamp-1">
                  {player.slot_number}. {player.name}
                </span>
                <span className="font-mono text-base font-bold text-amber-400">
                  {player.score} đ
                </span>
              </div>

              <div className="h-12 rounded-lg bg-[#070a12] border border-slate-800/80 flex items-center justify-center px-3 text-center">
                {!isRevealed ? (
                  resp ? (
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60">
                      Đã nộp ({(resp.response_time_ms / 1000).toFixed(2)}s)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      Đang suy nghĩ...
                    </span>
                  )
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white uppercase line-clamp-1">
                      {resp ? resp.answer_text : "(Trống)"}
                    </span>
                    {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                    {isWrong && <X className="w-4 h-4 text-red-400 shrink-0 ml-1" />}
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