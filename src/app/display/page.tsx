"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Check, X, Volume2, VolumeX, Maximize, Minimize, Home, Star, Crown, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

function countLettersOnly(str: string): number {
  if (!str) return 0;
  return str.replace(/\s+/g, "").length;
}

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);

  // PRECISION TIMESTAMP-BASED MASTER TIMER
  const [timerStartTime, setTimerStartTime] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [starOfHopeBanner, setStarOfHopeBanner] = useState<{ slot: number; name: string } | null>(null);

  const lastTickSecondRef = useRef<number>(15);

  // 4 Bục Thí Sinh Nobel Academic
  const slotThemes = [
    { name: "MÁY 1", border: "border-rose-500/40", accent: "text-rose-400", bg: "bg-[#140810]", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
    { name: "MÁY 2", border: "border-blue-500/40", accent: "text-blue-400", bg: "bg-[#081226]", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { name: "MÁY 3", border: "border-[#e0c588]/40", accent: "text-[#e0c588]", bg: "bg-[#1c1508]", badge: "bg-[#e0c588]/20 text-[#f4e5be] border-[#e0c588]/40" },
    { name: "MÁY 4", border: "border-emerald-500/40", accent: "text-emerald-400", bg: "bg-[#081a14]", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
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

  // CHẠY ĐỒNG HỒ ĐẾM LÙI TỪNG GIÂY
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerStartTime > 0) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        const rem = Math.max(0, timeLimit - elapsed);
        setTimeLeft(rem);

        if (rem !== lastTickSecondRef.current && rem > 0) {
          lastTickSecondRef.current = rem;
          sound.playTick();
        }

        if (rem <= 0) {
          sound.playTimeUp();
          setIsTimerRunning(false);
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStartTime, timeLimit]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "TOGGLE_STANDBY") {
        setMatchState((prev) => ({ ...prev, is_standby: event.is_standby }));
      } else if (event.type === "START_TIMER") {
        const start = event.start_time || Date.now();
        const limit = event.time_limit || 15;
        setTimerStartTime(start);
        setTimeLimit(limit);
        setTimeLeft(limit);
        lastTickSecondRef.current = limit;
        setIsTimerRunning(true);
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
        setIsTimerRunning(false);
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        const hasCorrect = Object.values(event.results).some((r) => r.is_correct);
        if (hasCorrect) {
          sound.playCorrect();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } else {
          sound.playWrong();
        }

        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            return res ? { ...p, score: Math.max(0, p.score + res.points_awarded) } : p;
          });

          const updatedResponses = { ...prev.current_responses };
          Object.entries(event.results).forEach(([slot, res]) => {
            const numSlot = Number(slot);
            if (updatedResponses[numSlot]) {
              updatedResponses[numSlot].is_correct = res.is_correct;
              updatedResponses[numSlot].points_awarded = res.points_awarded;
            }
          });

          return {
            ...prev,
            players: updatedPlayers,
            current_responses: updatedResponses,
            is_scored: true,
          };
        });
      } else if (event.type === "PRESS_BUZZER") {
        sound.playBuzzer();
        setMatchState((prev) => ({
          ...prev,
          buzzer_winner_slot: event.slot_number,
          buzzer_winner_time_ms: event.press_time_ms,
        }));
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({
          ...prev,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
        }));
      } else if (event.type === "TOGGLE_STAR_OF_HOPE") {
        setMatchState((prev) => ({ ...prev, star_of_hope_slot: event.slot_number }));
        if (event.slot_number) {
          sound.playCorrect();
          const p = matchState.players.find((item) => item.slot_number === event.slot_number);
          setStarOfHopeBanner({ slot: event.slot_number, name: p?.name || `Thí sinh ${event.slot_number}` });
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#e0c588", "#f4e5be", "#ffffff"] });
          setTimeout(() => setStarOfHopeBanner(null), 4500);
        }
      } else if (event.type === "SET_ACTIVE_PLAYER") {
        setMatchState((prev) => ({ ...prev, active_player_slot: event.slot_number }));
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number
              ? { ...p, score: Math.max(0, p.score + event.delta) }
              : p
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
        setIsTimerRunning(false);
        const qLimit = matchState.rounds[event.round_index]?.questions[event.question_index]?.time_limit || 15;
        setTimeLimit(qLimit);
        setTimeLeft(qLimit);
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
          current_responses: {},
        }));
      }
    });

    return () => unsubscribe();
  }, [matchState.players]);

  const currentRound = matchState.rounds[matchState.current_round_index];
  const currentQuestion = currentRound?.questions[matchState.current_question_index];
  const isMultipleChoice = currentQuestion?.question_type === "multiple_choice" || (currentQuestion?.options && currentQuestion.options.length > 0);
  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const activePlayer = matchState.players.find((p) => p.slot_number === matchState.active_player_slot);

  const progressPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

  return (
    <div className="h-screen w-screen bg-[#060c1a] text-slate-100 flex flex-col justify-between overflow-hidden relative font-sans select-none">
      {/* THANH LASER TIMER PROGRESS BAR RÚT DẦN TRÊN ĐỈNH MÀN HÌNH */}
      <div className="w-full h-2 bg-slate-900 absolute top-0 left-0 z-50 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-linear ${
            timeLeft <= 3 && isTimerRunning ? "bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse" : "bg-gradient-to-r from-[#c5a059] via-[#e0c588] to-[#f4e5be] shadow-lg shadow-[#e0c588]/50"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Dynamic Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[75vw] h-[220px] bg-gradient-to-b from-[#e0c588]/10 via-[#0a152e]/5 to-transparent blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <header className="relative z-10 px-8 py-3.5 flex items-center justify-between border-b border-slate-800/80 bg-[#070e1e]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" showWordmark={true} />
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-[#e0c588]/15 text-[#f4e5be] border border-[#e0c588]/30">
              {currentRound?.title || "VÒNG THI ĐẤU"}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold uppercase">
              CÂU {matchState.current_question_index + 1}/{currentRound?.questions.length || 0}
            </span>
          </div>
        </div>

        {/* TIMER DISPLAY */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 bg-[#091326] border border-[#e0c588]/30 px-5 py-1.5 rounded-2xl shadow-lg">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">THỜI GIAN:</span>
            <span className={`font-mono text-2xl md:text-3xl font-black tabular-nums transition-colors ${timeLeft <= 3 && isTimerRunning ? "text-rose-500 animate-pulse" : "text-[#e0c588]"}`}>
              {String(timeLeft).padStart(2, "0")}s
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-[#091326] border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#e0c588]" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-[#091326] border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#091326] border border-slate-800 text-slate-400 hover:text-white transition-all"
              title="Trang chủ"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* POPUP STAR OF HOPE BANNER */}
      {starOfHopeBanner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="bg-[#091326] border-2 border-[#e0c588] rounded-3xl p-10 max-w-xl text-center space-y-4 shadow-2xl shadow-[#e0c588]/30">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[#e0c588]/20 border border-[#e0c588] animate-bounce">
                <Star className="w-14 h-14 text-[#e0c588] fill-[#e0c588]" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">
              NGÔI SAO HY VỌNG ĐÃ ĐƯỢC CHỌN!
            </h2>
            <p className="text-xl font-bold text-[#f4e5be]">
              {starOfHopeBanner.name} (MÁY {starOfHopeBanner.slot})
            </p>
            <p className="text-xs font-semibold text-slate-400">
              Đúng: <span className="text-emerald-400 font-bold">+x2 Điểm</span> | Sai: <span className="text-rose-400 font-bold">-50% Điểm</span>
            </p>
          </div>
        </div>
      )}

      {/* BUZZER WINNER BANNER */}
      {matchState.buzzer_winner_slot && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 border border-white/60 rounded-2xl px-6 py-2.5 shadow-2xl shadow-rose-600/40 flex items-center gap-3 animate-pulse">
            <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
            <div>
              <span className="text-[10px] font-bold text-white/80 uppercase block">QUYỀN TRẢ LỜI CƯỚP ĐIỂM:</span>
              <span className="text-base font-black text-white uppercase">
                {matchState.players.find((p) => p.slot_number === matchState.buzzer_winner_slot)?.name} (MÁY {matchState.buzzer_winner_slot})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ARENA CENTER STAGE */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-12 py-4 max-w-6xl mx-auto w-full relative z-10">
        {matchState.is_standby ? (
          /* MÀN HÌNH CHỜ STANDBY */
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <BrandLogo size="xl" showWordmark={false} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                ĐẤU TRƯỜNG <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fef3c7] via-[#e0c588] to-[#c5a059]">OLYMQUIZ ARENA</span>
              </h1>
              <p className="text-base text-slate-400 font-medium tracking-wide">
                HỆ THỐNG THI ĐẤU ĐỐI KHÁNG THỜI GIAN THỰC
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#091326] border border-[#e0c588]/30 text-[#f4e5be] font-bold text-xs shadow-lg">
              <Sparkles className="w-4 h-4 text-[#e0c588]" /> SẴN SÀNG KHỞI TRANH
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CÂU HỎI */
          <div className="space-y-4">
            {/* VÒNG 4 SPOTLIGHT BANNER */}
            {isRound4VeDich && activePlayer && (
              <div className="flex items-center justify-center gap-2.5 bg-[#091326] border border-[#e0c588]/40 rounded-2xl py-2 px-5 shadow-md">
                <Crown className="w-4 h-4 text-[#e0c588]" />
                <span className="text-xs font-bold text-[#e0c588] uppercase">LƯỢT THI CHÍNH:</span>
                <span className="text-sm font-black text-white uppercase">{activePlayer.name} (MÁY {activePlayer.slot_number})</span>
                {matchState.star_of_hope_slot === activePlayer.slot_number && (
                  <span className="flex items-center gap-1 text-xs font-bold text-black bg-[#e0c588] border border-[#f4e5be] px-2 py-0.5 rounded-full ml-1 font-black">
                    <Star className="w-3 h-3 fill-black" /> ĐÃ ĐẶT SAO
                  </span>
                )}
              </div>
            )}

            {/* KHUNG CÂU HỎI SANG TRỌNG */}
            <div className="bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="absolute top-0 right-0 px-5 py-2 bg-[#e0c588]/10 border-b border-l border-[#e0c588]/30 rounded-bl-2xl text-xs font-mono font-bold text-[#e0c588]">
                +{currentQuestion?.points_correct || 10} ĐIỂM
              </div>

              <div className="space-y-3 max-w-4xl">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">NỘI DUNG CÂU HỎI:</span>
                <h2 className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
                  {currentQuestion?.question_text || "Đang chuẩn bị câu hỏi..."}
                </h2>

                {isRound2VCNV && currentQuestion?.correct_answer && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-[#060c1a] border border-[#e0c588]/30 text-[#f4e5be] text-xs font-bold">
                    💡 Gợi ý: Gồm <span className="text-white font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
                  </div>
                )}
              </div>

              {/* HIỂN THỊ 4 PHƯƠNG ÁN TRẮC NGHIỆM A, B, C, D */}
              {isMultipleChoice && currentQuestion?.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-5 mt-4 border-t border-slate-800">
                  {currentQuestion.options.map((opt, idx) => {
                    const label = ["A", "B", "C", "D"][idx] || String(idx + 1);
                    const isCorrectOpt = matchState.is_revealed && (opt === currentQuestion.correct_answer || opt.startsWith(currentQuestion.correct_answer[0]));

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                          isCorrectOpt
                            ? "bg-emerald-950/90 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 scale-102"
                            : "bg-[#060c1a] border-slate-700/80 text-slate-200"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${
                          isCorrectOpt ? "bg-emerald-500 text-black" : "bg-[#091326] text-[#e0c588] border border-slate-700"
                        }`}>
                          {label}
                        </span>
                        <span className="text-sm font-bold leading-snug">
                          {opt.replace(/^[A-D]\.\s*/, "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* VÒNG 2: BẢNG Ô CHỮ CHƯỚNG NGẠI VẬT */}
            {isRound2VCNV && (
              <div className="bg-[#091326] border border-slate-800/80 rounded-2xl p-4 space-y-2.5 shadow-lg">
                <div className="text-center">
                  <span className="text-xs font-bold text-[#e0c588] uppercase tracking-wider">CHƯỚNG NGẠI VẬT BÍ MẬT (8 CHỮ CÁI)</span>
                  <div className="flex justify-center gap-2 mt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-11 h-12 rounded-xl border font-black text-lg flex items-center justify-center transition-all ${
                          matchState.is_revealed
                            ? "bg-[#e0c588] border-[#f4e5be] text-black scale-105"
                            : "bg-[#060c1a] border-slate-700 text-slate-500"
                        }`}
                      >
                        {matchState.is_revealed ? "OLYMPIA"[i] || "★" : "?"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ĐÁP ÁN CÔNG BỐ (CHO TỰ LUẬN) */}
            {matchState.is_revealed && !isMultipleChoice && currentQuestion?.correct_answer && (
              <div className="bg-[#081814] border border-emerald-500/60 rounded-2xl p-3.5 text-center shadow-xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">ĐÁP ÁN CHÍNH XÁC:</span>
                <span className="text-xl font-black text-white uppercase tracking-widest">{currentQuestion.correct_answer}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM 4 THÍ SINH PODIUM */}
      <footer className="relative z-10 px-8 py-3.5 bg-[#060c1a]/95 border-t border-slate-800/80 backdrop-blur-md">
        <div className="grid grid-cols-4 gap-3.5 max-w-6xl mx-auto">
          {matchState.players.map((player) => {
            const theme = slotThemes[player.slot_number - 1];
            const response = matchState.current_responses[player.slot_number];
            const isBuzzerWinner = matchState.buzzer_winner_slot === player.slot_number;
            const isStar = matchState.star_of_hope_slot === player.slot_number;
            const isMainPlayer = isRound4VeDich && matchState.active_player_slot === player.slot_number;

            return (
              <div
                key={player.slot_number}
                className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${theme.bg} ${
                  isBuzzerWinner ? "border-rose-500 shadow-xl shadow-rose-500/30 scale-102" :
                  isMainPlayer ? "border-[#e0c588] shadow-xl shadow-[#e0c588]/30 scale-102" :
                  theme.border
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${theme.badge}`}>
                    MÁY {player.slot_number}
                  </span>
                  {isStar && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-black bg-[#e0c588] px-1.5 py-0.5 rounded-full font-mono">
                      <Star className="w-2.5 h-2.5 fill-black" /> SAO
                    </span>
                  )}
                </div>

                <div className="my-1.5">
                  <h3 className="text-sm font-bold text-white truncate">{player.name || `Thí sinh ${player.slot_number}`}</h3>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{player.school_name || "Trường..."}</p>
                </div>

                {/* Trạng thái trả lời */}
                <div className="min-h-[28px] flex items-center justify-center rounded-xl bg-black/40 border border-slate-800/80 px-2 py-0.5">
                  {matchState.is_revealed && response ? (
                    <div className="flex items-center gap-1 truncate">
                      {response.is_correct ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span className="text-xs font-bold text-white truncate">{response.answer_text}</span>
                    </div>
                  ) : response ? (
                    <span className="text-[11px] font-bold text-[#e0c588] flex items-center gap-1">
                      <Check className="w-3 h-3" /> ĐÃ NỘP ({(response.response_time_ms / 1000).toFixed(2)}s)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-semibold uppercase">ĐANG NGHĨ...</span>
                  )}
                </div>

                {/* Điểm số */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">ĐIỂM:</span>
                  <span className="font-mono text-xl font-black text-[#e0c588] tabular-nums">
                    {player.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
