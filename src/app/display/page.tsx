"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Check, X, Volume2, VolumeX, Maximize, Minimize, Home, Star, Crown, Flame, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

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
    { name: "ĐỎ", color: "from-red-600 to-rose-700", glow: "shadow-red-600/30", border: "border-red-500/60", bg: "bg-red-950/40", text: "text-red-400", badge: "bg-red-500/20 text-red-300 border-red-500/40" },
    { name: "XANH", color: "from-blue-600 to-indigo-700", glow: "shadow-blue-600/30", border: "border-blue-500/60", bg: "bg-blue-950/40", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { name: "VÀNG", color: "from-amber-500 to-yellow-600", glow: "shadow-amber-500/30", border: "border-amber-500/60", bg: "bg-amber-950/40", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    { name: "LỤC", color: "from-emerald-500 to-teal-700", glow: "shadow-emerald-500/30", border: "border-emerald-500/60", bg: "bg-emerald-950/40", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
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
            if (res) {
              return { ...p, score: Math.max(0, p.score + res.points_awarded) };
            }
            return p;
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
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] });
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
  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const activePlayer = matchState.players.find((p) => p.slot_number === matchState.active_player_slot);

  return (
    <div className="h-screen w-screen bg-[#030712] text-slate-100 flex flex-col justify-between overflow-hidden relative font-sans select-none">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[250px] bg-gradient-to-b from-blue-900/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vw] h-[200px] bg-gradient-to-t from-blue-950/30 to-transparent blur-3xl pointer-events-none" />

      {/* TOP HEADER BROADCAST BAR */}
      <header className="relative z-10 px-8 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#070b18]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" showWordmark={true} />
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
              {currentRound?.title || "VÒNG THI ĐẤU"}
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase">
              CÂU {matchState.current_question_index + 1} / {currentRound?.questions.length || 0}
            </span>
          </div>
        </div>

        {/* TIMER DISPLAY */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#0d1326] border border-amber-500/30 px-5 py-1.5 rounded-2xl shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">THỜI GIAN:</span>
            <span className={`font-mono text-3xl font-black tabular-nums transition-colors ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-amber-400"}`}>
              {String(timeLeft).padStart(2, "0")}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all"
              title="Trang chủ"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* POPUP STAR OF HOPE BANNER */}
      {starOfHopeBanner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-b from-amber-950 via-[#1a1200] to-black border-2 border-amber-400 rounded-3xl p-10 max-w-2xl text-center space-y-4 shadow-2xl shadow-amber-500/40">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-amber-500/20 border-2 border-amber-400 animate-bounce">
                <Star className="w-16 h-16 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-amber-300 uppercase tracking-widest">
              NGÔI SAO HY VỌNG ĐÃ ĐƯỢC CHỌN!
            </h2>
            <p className="text-2xl font-bold text-white">
              {starOfHopeBanner.name} (MÁY {starOfHopeBanner.slot})
            </p>
            <p className="text-sm font-semibold text-amber-400/90">
              Đúng: <span className="text-emerald-400 font-black">+x2 Điểm</span> | Sai: <span className="text-rose-400 font-black">-50% Điểm</span>
            </p>
          </div>
        </div>
      )}

      {/* BUZZER WINNER BANNER */}
      {matchState.buzzer_winner_slot && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top-6 duration-300">
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-2 border-white/80 rounded-2xl px-8 py-3 shadow-2xl shadow-red-600/50 flex items-center gap-4 animate-pulse">
            <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" />
            <div>
              <span className="text-xs font-bold text-white/90 uppercase tracking-wider block">QUYỀN TRẢ LỜI CƯỚP ĐIỂM THUỘC VỀ:</span>
              <span className="text-xl font-black text-white uppercase">
                {matchState.players.find((p) => p.slot_number === matchState.buzzer_winner_slot)?.name} (MÁY {matchState.buzzer_winner_slot})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ARENA CENTER STAGE */}
      <main className="flex-1 flex flex-col justify-center px-10 py-4 max-w-7xl mx-auto w-full relative z-10">
        {matchState.is_standby ? (
          /* MÀN HÌNH CHỜ STANDBY SANG TRỌNG */
          <div className="text-center space-y-6 animate-pulse-subtle">
            <div className="flex justify-center">
              <BrandLogo size="xl" showWordmark={false} />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 uppercase tracking-widest">
                ĐẤU TRƯỜNG OLYMQUIZ 2026
              </h1>
              <p className="text-lg text-slate-400 font-medium tracking-wide">
                HỆ THỐNG THI ĐẤU TRI THỨC TRỰC TUYẾN THỜI GIAN THỰC
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0d121f] border border-amber-500/30 text-amber-300 font-bold text-sm shadow-xl">
              <Sparkles className="w-4 h-4 text-amber-400" /> SẴN SÀNG KHỞI TRANH TRẬN ĐẤU
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CÂU HỎI CHÍNH */
          <div className="space-y-6">
            {/* VÒNG 4 SPOTLIGHT BANNER */}
            {isRound4VeDich && activePlayer && (
              <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/40 rounded-2xl py-2 px-6 shadow-md">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">LƯỢT THI CHÍNH:</span>
                <span className="text-base font-black text-white uppercase">{activePlayer.name} (MÁY {activePlayer.slot_number})</span>
                {matchState.star_of_hope_slot === activePlayer.slot_number && (
                  <span className="flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-500/20 border border-amber-400 px-2.5 py-0.5 rounded-full ml-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> ĐẶT NGÔI SAO HY VỌNG
                  </span>
                )}
              </div>
            )}

            {/* KHUNG CÂU HỎI 4K */}
            <div className="bg-[#0b1020]/95 border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2 bg-amber-500/10 border-b border-l border-amber-500/30 rounded-bl-2xl text-xs font-black text-amber-400 uppercase">
                +{currentQuestion?.points_correct || 10} ĐIỂM
              </div>

              <div className="space-y-4 max-w-5xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">NỘI DUNG CÂU HỎI:</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed tracking-wide">
                  {currentQuestion?.question_text || "Đang chuẩn bị câu hỏi..."}
                </h2>

                {/* GỢI Ý ĐẾM CHỮ VÒNG 2 */}
                {isRound2VCNV && currentQuestion?.correct_answer && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-bold">
                    💡 Đáp án gồm <span className="text-amber-400 text-sm font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
                  </div>
                )}
              </div>
            </div>

            {/* VÒNG 2: BẢNG Ô CHỮ CHƯỚNG NGẠI VẬT */}
            {isRound2VCNV && (
              <div className="bg-[#070a14] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="text-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">CHƯỚNG NGẠI VẬT BÍ MẬT (8 CHỮ CÁI)</span>
                  <div className="flex justify-center gap-2 mt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-12 h-14 rounded-xl border-2 font-black text-xl flex items-center justify-center shadow-lg transition-all ${
                          matchState.is_revealed
                            ? "bg-amber-500 border-amber-300 text-black scale-105"
                            : "bg-[#0f172a] border-slate-700 text-slate-500"
                        }`}
                      >
                        {matchState.is_revealed ? "OLYMPIA"[i] || "★" : "?"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ĐÁP ÁN ĐƯỢC CÔNG BỐ */}
            {matchState.is_revealed && currentQuestion?.correct_answer && (
              <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl p-4 text-center shadow-2xl animate-in zoom-in-95">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">ĐÁP ÁN CHÍNH XÁC:</span>
                <span className="text-2xl font-black text-white tracking-widest uppercase">{currentQuestion.correct_answer}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM: 4 THÍ SINH PODIUM ARENA */}
      <footer className="relative z-10 px-8 py-4 bg-[#070b18]/95 border-t border-slate-800 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-4 max-w-7xl mx-auto">
          {matchState.players.map((player) => {
            const theme = slotThemes[player.slot_number - 1];
            const response = matchState.current_responses[player.slot_number];
            const isBuzzerWinner = matchState.buzzer_winner_slot === player.slot_number;
            const isStar = matchState.star_of_hope_slot === player.slot_number;
            const isMainPlayer = isRound4VeDich && matchState.active_player_slot === player.slot_number;

            return (
              <div
                key={player.slot_number}
                className={`relative rounded-2xl border-2 transition-all p-4 flex flex-col justify-between ${theme.bg} ${
                  isBuzzerWinner ? "border-red-500 shadow-2xl shadow-red-500/40 scale-105" :
                  isMainPlayer ? "border-amber-400 shadow-2xl shadow-amber-500/30 scale-102" :
                  theme.border
                }`}
              >
                {/* Header Bục */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border ${theme.badge}`}>
                    MÁY {player.slot_number}
                  </span>
                  {isStar && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400" /> SAO
                    </span>
                  )}
                </div>

                {/* Tên & Trường */}
                <div className="my-2">
                  <h3 className="text-base font-extrabold text-white truncate">{player.name || `Thí sinh ${player.slot_number}`}</h3>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{player.school_name || "Trường THPT..."}</p>
                </div>

                {/* Trạng thái trả lời */}
                <div className="min-h-[36px] flex items-center justify-center rounded-xl bg-black/40 border border-slate-800/80 px-2 py-1">
                  {matchState.is_revealed && response ? (
                    <div className="flex items-center gap-1.5 truncate">
                      {response.is_correct ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-rose-400 shrink-0" />}
                      <span className="text-xs font-bold text-white truncate">{response.answer_text}</span>
                    </div>
                  ) : response ? (
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ĐÃ NỘP ({(response.response_time_ms / 1000).toFixed(2)}s)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-semibold uppercase">ĐANG SUY NGHĨ...</span>
                  )}
                </div>

                {/* Điểm số */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ĐIỂM:</span>
                  <span className="font-mono text-2xl font-black text-amber-400 tabular-nums">
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
