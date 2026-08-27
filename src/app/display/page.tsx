"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Check, X, Volume2, VolumeX, Maximize, Minimize, Home, Star, UserCheck } from "lucide-react";

function countLettersOnly(str: string): number {
  if (!str) return 0;
  return str.replace(/\s+/g, "").length;
}

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [starOfHopeBanner, setStarOfHopeBanner] = useState<{ slot: number; name: string } | null>(null);

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
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            sound.playTimeUp();
            setIsTimerActive(false);
            return 0;
          }
          sound.playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);

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
      } else if (event.type === "TOGGLE_STAR_OF_HOPE") {
        setMatchState((prev) => ({ ...prev, star_of_hope_slot: event.slot_number }));
        if (event.slot_number) {
          sound.playReveal();
          const p = matchState.players.find((pl) => pl.slot_number === event.slot_number);
          setStarOfHopeBanner({ slot: event.slot_number, name: p?.name || `Thí sinh ${event.slot_number}` });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] });
          setTimeout(() => setStarOfHopeBanner(null), 4000);
        }
      } else if (event.type === "SET_ACTIVE_PLAYER") {
        setMatchState((prev) => ({ ...prev, active_player_slot: event.slot_number }));
        if (event.slot_number) {
          sound.playReveal();
        }
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
        const question = round?.questions[event.question_index] || round?.questions[0];
        const newLimit = question?.time_limit || 15;
        setTimeLimit(newLimit);
        setTimeLeft(newLimit);
        setIsTimerActive(false);
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_timer_running: false,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
          star_of_hope_slot: null,
          current_responses: {},
        }));
      }
    });
    return () => unsubscribe();
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];
  const sortedPlayers = [...matchState.players].sort((a, b) => b.score - a.score);

  const isVCNV = currentRound?.round_type === "vchv";
  const isVeDich = currentRound?.round_type === "ve_dich";
  const vcnvQuestions = isVCNV ? currentRound.questions : [];
  const obstacleQuestion = isVCNV ? vcnvQuestions[vcnvQuestions.length - 1] : null;
  const obstacleAnswerClean = obstacleQuestion ? obstacleQuestion.correct_answer.replace(/\s+/g, "") : "";
  const obstacleLettersCount = countLettersOnly(obstacleQuestion?.correct_answer || "");

  const activePlayer = matchState.players.find((p) => p.slot_number === matchState.active_player_slot);
  const basePoints = currentQuestion?.points_correct || 20;
  const hasAnyStar = isVeDich && matchState.star_of_hope_slot !== null;

  return (
    <div className="h-screen w-screen bg-[#070a12] text-white flex flex-col justify-between p-6 font-sans select-none overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-600/15 via-amber-500/5 to-transparent blur-[140px] pointer-events-none" />

      {/* POPUP BÙNG NỔ NGÔI SAO HY VỌNG */}
      {starOfHopeBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in zoom-in duration-300 pointer-events-none">
          <div className="text-center space-y-4 p-8 rounded-3xl bg-gradient-to-b from-amber-950/90 to-[#070a12] border-2 border-amber-400 shadow-2xl shadow-amber-500/50 max-w-xl mx-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-lg animate-bounce">
              <Star className="w-14 h-14 fill-current" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 tracking-wider">
                NGÔI SAO HY VỌNG!
              </h2>
              <p className="text-xl font-black text-white uppercase">
                {starOfHopeBanner.name} (BỤC SỐ {starOfHopeBanner.slot})
              </p>
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/40 text-xs text-amber-200 font-bold space-y-1">
                <div>✨ TRẢ LỜI ĐÚNG: <span className="text-emerald-400 font-black">+{basePoints * 2} ĐIỂM (x2)</span></div>
                <div>⚠️ TRẢ LỜI SAI: <span className="text-rose-400 font-black">-{Math.floor(basePoints / 2)} ĐIỂM (-50%)</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Máy Chiếu */}
      <header className="flex items-center justify-between z-10 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider">
            OLYMQUIZ 2026
          </span>
          <span className="text-sm font-bold text-white uppercase">
            {currentRound?.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-[#0d121f] border border-slate-800 hover:text-white text-slate-400 cursor-pointer"
            title="Bật / Tắt âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#0d121f] border border-slate-800 hover:text-white text-slate-400 cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#0d121f] border border-slate-800 hover:text-white text-slate-400"
            title="Về Trang Chủ"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* MÀN HÌNH CHỜ STANDBY */}
      {matchState.is_standby ? (
        <main className="flex-1 flex flex-col justify-center items-center my-auto space-y-8 z-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-tight">
              BẢNG TỔNG SẮP <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">ĐIỂM SỐ</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Trận đấu đang chuẩn bị bước vào phần thi tiếp theo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl">
            {sortedPlayers.map((player, rank) => {
              const theme = slotThemes[player.slot_number - 1];
              return (
                <div
                  key={player.slot_number}
                  className={`bg-[#0d121f] border ${theme.border} rounded-3xl p-6 text-center space-y-4 shadow-xl`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${theme.badge}`}>
                      BỤC {player.slot_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">#{rank + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white line-clamp-1">{player.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{player.school_name || "Thí sinh"}</p>
                  </div>

                  <div className="py-3 bg-[#070a12] rounded-2xl border border-slate-800">
                    <span className="font-mono text-4xl font-black text-amber-400">{player.score}</span>
                    <span className="text-xs text-slate-500 ml-1 font-bold">điểm</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        /* MÀN HÌNH THI ĐẤU TRỰC TIẾP */
        <main className="flex-1 flex flex-col justify-between my-4 space-y-4 z-10">
          {/* BANNER SPOTLIGHT LƯỢT THI VÒNG VỀ ĐÍCH CỦA THÍ SINH */}
          {isVeDich && activePlayer && (
            <div className="bg-gradient-to-r from-amber-500/25 via-yellow-500/35 to-amber-500/25 border-2 border-amber-400 rounded-2xl p-3 text-center shadow-lg shadow-amber-500/30 animate-in fade-in flex flex-wrap items-center justify-between px-6 gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-sm shadow">
                  {activePlayer.slot_number}
                </span>
                <div>
                  <span className="text-sm font-black uppercase text-amber-300 tracking-wider block text-left">
                    LƯỢT THI VỀ ĐÍCH: {activePlayer.name}
                  </span>
                  <span className="text-[11px] text-slate-300 text-left block">
                    {activePlayer.school_name || "Thí sinh"} • Điểm hiện tại: {activePlayer.score}đ
                  </span>
                </div>
              </div>

              {hasAnyStar ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs shadow animate-pulse">
                  <Star className="w-4 h-4 fill-current" />
                  <span>ĐANG ĐẶT SAO: ĐÚNG +{basePoints * 2}đ / SAI -{Math.floor(basePoints / 2)}đ</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-amber-200">
                  ⭐ 3 thí sinh còn lại sẵn sàng cướp điểm (+{basePoints}đ / -{Math.floor(basePoints / 2)}đ)
                </span>
              )}
            </div>
          )}

          {/* BẢNG Ô CHỮ VÒNG 2 */}
          {isVCNV && (
            <div className="bg-[#0d121f] border-2 border-blue-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase">
                    TỪ KHÓA CHƯỚNG NGẠI VẬT: {obstacleLettersCount} CHỮ CÁI
                  </span>
                  <span className="text-xs text-slate-400 font-medium">(Không tính khoảng trắng)</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  {matchState.current_question_index === vcnvQuestions.length - 1 ? "Đang mở Từ Khóa Chính (+40đ)" : `Đang thi Hàng Ngang số ${matchState.current_question_index + 1}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 py-2">
                {Array.from({ length: obstacleLettersCount }).map((_, idx) => {
                  const isObstacleRevealed = matchState.current_question_index === vcnvQuestions.length - 1 && matchState.is_revealed;
                  const letter = obstacleAnswerClean[idx] || "";
                  return (
                    <div
                      key={idx}
                      className={`w-11 h-12 rounded-xl flex items-center justify-center font-black text-xl font-mono shadow-lg transition-all ${
                        isObstacleRevealed
                          ? "bg-emerald-500 text-black border-2 border-emerald-300 scale-105"
                          : "bg-[#070a12] border-2 border-blue-500/60 text-blue-400"
                      }`}
                    >
                      {isObstacleRevealed ? letter : "?"}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                {vcnvQuestions.slice(0, vcnvQuestions.length - 1).map((q, idx) => {
                  const lettersCount = countLettersOnly(q.correct_answer);
                  const isCurrent = matchState.current_question_index === idx;
                  const isRevealed = isCurrent && matchState.is_revealed;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        isRevealed
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                          : isCurrent
                          ? "bg-blue-950/60 border-blue-500 text-white ring-2 ring-blue-500/30"
                          : "bg-[#070a12] border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block tracking-wider">HÀNG NGANG {idx + 1}</span>
                      <span className="text-xs font-bold font-mono text-amber-400">{lettersCount} chữ cái</span>
                      {isRevealed && (
                        <span className="text-sm font-black uppercase text-white block mt-1 line-clamp-1">{q.correct_answer}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KHUNG CÂU HỎI & ĐỒNG HỒ ĐẾM NGƯỢC */}
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase">
                  {isVCNV ? (matchState.current_question_index === vcnvQuestions.length - 1 ? "TỪ KHÓA CHÍNH" : `HÀNG NGANG ${matchState.current_question_index + 1} (${countLettersOnly(currentQuestion?.correct_answer)} CHỮ CÁI)`) : `CÂU HỎI ${matchState.current_question_index + 1}`}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {hasAnyStar ? (
                    <span className="text-amber-400 font-bold">⭐ Đang đặt sao: +{basePoints * 2}đ đúng / -{Math.floor(basePoints / 2)}đ sai</span>
                  ) : (
                    <span>+{currentQuestion?.points_correct}đ đúng / -{currentQuestion?.points_wrong}đ sai</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {matchState.buzzer_winner_slot && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-black font-black text-xs animate-bounce">
                    <Zap className="w-4 h-4 fill-current" />
                    TS {matchState.buzzer_winner_slot} GIÀNH QUYỀN TRẢ LỜI!
                  </div>
                )}

                <div className={`px-5 py-2 rounded-2xl font-mono text-2xl font-black border flex items-center gap-2 ${
                  isTimerActive
                    ? timeLeft <= 5
                      ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse"
                      : "bg-blue-950/80 border-blue-500 text-blue-400"
                    : "bg-[#070a12] border-slate-800 text-slate-400"
                }`}>
                  <span>{timeLeft}s</span>
                </div>
              </div>
            </div>

            <p className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed text-center py-4">
              {currentQuestion?.question_text}
            </p>

            {currentQuestion?.options && currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#070a12] border border-slate-800 text-base font-bold text-slate-200 flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt.replace(/^[A-D][\.\:\)]\s*/, "")}</span>
                  </div>
                ))}
              </div>
            )}

            {matchState.is_revealed && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-center animate-in zoom-in">
                <span className="text-xs uppercase font-bold text-emerald-400 block mb-1">
                  ĐÁP ÁN CHÍNH XÁC {isVCNV ? `(${countLettersOnly(currentQuestion?.correct_answer)} CHỮ CÁI)` : ""}:
                </span>
                <span className="text-2xl font-black text-white">{currentQuestion?.correct_answer}</span>
              </div>
            )}
          </div>

          {/* 4 BỤC THÍ SINH SÂN KHẤU (CÓ SPOTLIGHT THÍ SINH ĐANG THI CHÍNH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {matchState.players.map((player) => {
              const theme = slotThemes[player.slot_number - 1];
              const resp = matchState.current_responses[player.slot_number];
              const hasStar = isVeDich && matchState.star_of_hope_slot === player.slot_number;
              const isActive = isVeDich && matchState.active_player_slot === player.slot_number;

              return (
                <div
                  key={player.slot_number}
                  className={`bg-[#0d121f] border-2 ${
                    isActive
                      ? "border-amber-400 ring-4 ring-amber-400/30 scale-[1.03] shadow-xl shadow-amber-500/20"
                      : hasStar
                      ? "border-amber-400 shadow-lg shadow-amber-500/20"
                      : resp?.is_correct === true
                      ? "border-emerald-500 bg-emerald-950/30"
                      : resp?.is_correct === false
                      ? "border-red-500 bg-red-950/30"
                      : theme.border
                  } rounded-3xl p-5 space-y-3 relative overflow-hidden transition-all`}
                >
                  {hasStar && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black font-black text-[10px] shadow animate-pulse">
                      <Star className="w-3 h-3 fill-current" />
                      <span>x2 ĐIỂM</span>
                    </div>
                  )}

                  {isActive && !hasStar && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[10px] shadow">
                      <span>ĐANG THI CHÍNH</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${theme.badge}`}>
                        BỤC {player.slot_number}
                      </span>
                      <span className="font-bold text-sm text-white line-clamp-1">{player.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#070a12] p-3 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 font-medium">Điểm số:</span>
                    <span className="font-mono text-2xl font-black text-amber-400">{player.score}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#070a12] border border-slate-800 text-center min-h-[50px] flex items-center justify-center">
                    {matchState.is_revealed ? (
                      resp ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm uppercase text-white truncate mr-2">{resp.answer_text}</span>
                          {resp.is_correct ? (
                            <span className="text-emerald-400 font-bold text-xs flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5" /> +{resp.points_awarded}
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold text-xs flex items-center gap-0.5">
                              <X className="w-3.5 h-3.5" /> {resp.points_awarded}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">— Chưa nộp bài</span>
                      )
                    ) : resp ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã gửi ({(resp.response_time_ms / 1000).toFixed(2)}s)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Đang suy nghĩ...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      <footer className="w-full" />
    </div>
  );
}
