"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { checkAnswerCorrectness } from "@/lib/grading";
import { MatchState, RealtimeEventPayload, DisplaySlideMode } from "@/types/game";
import {
  Zap,
  Check,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Home,
  Star,
  Crown,
  Sparkles,
  Lightbulb,
  Trophy,
  Users,
  BookOpen,
  Layers,
} from "lucide-react";
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

  // ĐĂNG KÝ WEBSOCKET 1 LẦN DUY NHẤT
  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "TOGGLE_STANDBY") {
        setMatchState((prev) => ({ ...prev, is_standby: event.is_standby }));
      } else if (event.type === "CHANGE_DISPLAY_MODE") {
        setMatchState((prev) => ({ ...prev, display_slide_mode: event.mode }));
        if (event.mode === "leaderboard") {
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: ["#e0c588", "#f4e5be", "#ffffff"] });
        }
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
          display_slide_mode: "question",
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
            is_revealed: true,
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
          const sNum = event.slot_number;
          sound.playCorrect();
          setMatchState((currentState) => {
            const p = currentState.players.find((item) => item.slot_number === sNum);
            setStarOfHopeBanner({ slot: sNum, name: p?.name || `Thí sinh ${sNum}` });
            return currentState;
          });
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
        setMatchState((prev) => {
          const qLimit = prev.rounds[event.round_index]?.questions[event.question_index]?.time_limit || 15;
          setTimeLimit(qLimit);
          setTimeLeft(qLimit);
          return {
            ...prev,
            current_round_index: event.round_index,
            current_question_index: event.question_index,
            display_slide_mode: "question",
            is_locked: false,
            is_revealed: false,
            is_scored: false,
            buzzer_winner_slot: null,
            current_responses: {},
          };
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];
  const isMultipleChoice = currentQuestion?.question_type === "multiple_choice" || (currentQuestion?.options && currentQuestion.options.length > 0);
  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const activePlayer = matchState.players.find((p) => p.slot_number === matchState.active_player_slot);

  const progressPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

  const currentMode: DisplaySlideMode = matchState.is_standby
    ? "standby"
    : matchState.display_slide_mode || "question";

  // CHI TIẾT THỂ LỆ 4 VÒNG THI
  const roundRulesData = [
    {
      roundNum: 1,
      title: "VÒNG 1: KHỞI ĐỘNG",
      subtitle: "Trắc nghiệm tốc độ 4 phương án A, B, C, D",
      time: "15 giây / câu",
      scoring: "+10 điểm mỗi câu đúng",
      rules: [
        "Mỗi câu hỏi có 15 giây suy nghĩ và nộp đáp án.",
        "Mỗi câu trả lời đúng được +10 Điểm. Trả lời sai không bị trừ điểm.",
        "4 thí sinh cùng thi đấu đối kháng và chọn đáp án độc lập trên máy cá nhân.",
      ],
    },
    {
      roundNum: 2,
      title: "VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT",
      subtitle: "Giải mã 4 hàng ngang tìm Từ Khóa bí mật",
      time: "15 giây / hàng ngang",
      scoring: "+10đ hàng ngang • +60đ / +40đ / +20đ Từ khóa chính",
      rules: [
        "Gồm 4 câu hỏi hàng ngang kèm gợi ý số lượng chữ cái.",
        "Mỗi câu hàng ngang đúng được +10 Điểm cho các thí sinh trả lời đúng.",
        "Bấm chuông trả lời Chướng ngại vật: +60đ (sau hàng 1), +40đ (sau hàng 2), +20đ (sau hàng 3).",
        "Trả lời sai Chướng ngại vật sẽ bị tước quyền thi đấu ở phần còn lại của vòng này.",
      ],
    },
    {
      roundNum: 3,
      title: "VÒNG 3: TĂNG TỐC",
      subtitle: "Cuộc đua phản xạ thời gian mili-giây",
      time: "10s - 20s - 30s - 40s",
      scoring: "+40đ • +30đ • +20đ • +10đ theo tốc độ",
      rules: [
        "Gồm 4 câu hỏi với các mốc thời gian tăng dần: 10s (câu 1), 20s (câu 2), 30s (câu 3), 40s (câu 4).",
        "Thứ tự cộng điểm cho các thí sinh trả lời đúng: Nhanh nhất (+40đ) • Nhanh nhì (+30đ) • Nhanh ba (+20đ) • Nhanh tư (+10đ).",
        "Thời gian phản hồi được đo chính xác đến từng mili-giây.",
      ],
    },
    {
      roundNum: 4,
      title: "VÒNG 4: VỀ ĐÍCH",
      subtitle: "Gói câu hỏi & Ngôi Sao Hy Vọng",
      time: "15s - 20s / câu",
      scoring: "+20đ / +30đ • Sao Hy Vọng (x2 hoặc -50%)",
      rules: [
        "Mỗi thí sinh có 1 lượt thi chính với các câu hỏi 20 điểm và 30 điểm.",
        "Quyền đặt Ngôi Sao Hy Vọng 1 lần: Trả lời đúng +x2 Điểm • Trả lời sai -50% Điểm câu hỏi.",
        "Nếu thí sinh chính trả lời sai, 3 thí sinh còn lại có quyền Bấm Chuông Cướp Điểm.",
        "Cướp điểm đúng được trọn số điểm của câu • Cướp điểm sai bị trừ 50% số điểm của câu.",
      ],
    },
  ];

  const sortedPlayers = [...matchState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-screen w-screen bg-[#060c1a] text-slate-100 flex flex-col justify-between overflow-hidden relative font-sans select-none">
      {/* THANH LASER TIMER PROGRESS BAR */}
      {currentMode === "question" && (
        <div className="w-full h-2 bg-slate-900 absolute top-0 left-0 z-50 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              timeLeft <= 3 && isTimerRunning ? "bg-rose-500 shadow-lg shadow-rose-500/80" : "bg-gradient-to-r from-[#c5a059] via-[#e0c588] to-[#f4e5be]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* TOP HEADER */}
      <header className="relative z-10 px-8 py-3.5 flex items-center justify-between border-b border-slate-800 bg-[#070e1e] shrink-0">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" showWordmark={true} />
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-[#e0c588]/15 text-[#f4e5be] border border-[#e0c588]/30">
              {currentRound?.title || "VÒNG THI ĐẤU"}
            </span>

            {currentMode === "question" && (
              <span className="text-xs text-slate-400 font-mono font-bold uppercase">
                CÂU {matchState.current_question_index + 1}/{currentRound?.questions.length || 0}
              </span>
            )}
            {currentMode === "intro_players" && (
              <span className="text-xs text-blue-400 font-mono font-bold uppercase flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> GIỚI THIỆU 4 THÍ SINH
              </span>
            )}
            {currentMode === "rules_all" && (
              <span className="text-xs text-[#e0c588] font-mono font-bold uppercase flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> TỔNG QUAN 4 VÒNG THI ĐẤU
              </span>
            )}
            {["rules_1", "rules_2", "rules_3", "rules_4"].includes(currentMode) && (
              <span className="text-xs text-amber-400 font-mono font-bold uppercase flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> THỂ LỆ VÒNG {currentMode.replace("rules_", "")}
              </span>
            )}
            {currentMode === "leaderboard" && (
              <span className="text-xs text-emerald-400 font-mono font-bold uppercase flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> BẢNG VÀNG VINH DANH
              </span>
            )}
          </div>
        </div>

        {/* TIMER DISPLAY */}
        <div className="flex items-center gap-5">
          {currentMode === "question" && (
            <div className="flex items-center gap-3 bg-[#091326] border border-[#e0c588]/30 px-5 py-1.5 rounded-2xl shadow-lg">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">THỜI GIAN:</span>
              <span className={`font-mono text-2xl md:text-3xl font-black tabular-nums ${timeLeft <= 3 && isTimerRunning ? "text-rose-500" : "text-[#e0c588]"}`}>
                {String(timeLeft).padStart(2, "0")}s
              </span>
            </div>
          )}

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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85">
          <div className="bg-[#091326] border-2 border-[#e0c588] rounded-3xl p-10 max-w-xl text-center space-y-4 shadow-2xl shadow-[#e0c588]/30">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[#e0c588]/20 border border-[#e0c588]">
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
      {matchState.buzzer_winner_slot && currentMode === "question" && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 border border-white/60 rounded-2xl px-6 py-2.5 shadow-2xl shadow-rose-600/40 flex items-center gap-3">
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

      {/* ============================================================ */}
      {/* MAIN ARENA CENTER STAGE (MULTI-SLIDE MODES) */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-12 py-4 max-w-6xl mx-auto w-full relative z-10 overflow-hidden">
        {/* SLIDE: STANDBY */}
        {currentMode === "standby" && (
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
        )}

        {/* SLIDE: GIỚI THIỆU 4 THÍ SINH */}
        {currentMode === "intro_players" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-[#e0c588] uppercase tracking-widest">
                DANH SÁCH 4 GƯƠNG MẶT THI ĐẤU
              </span>
              <h2 className="text-3xl font-black text-white uppercase">4 THÍ SINH XUẤT SẮC</h2>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {matchState.players.map((p) => {
                const theme = slotThemes[p.slot_number - 1];
                return (
                  <div
                    key={p.slot_number}
                    className={`rounded-3xl border-2 p-6 flex flex-col justify-between space-y-5 shadow-2xl ${theme.bg} ${theme.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-black uppercase px-3 py-1 rounded-xl border ${theme.badge}`}>
                        MÁY {p.slot_number}
                      </span>
                      <Crown className={`w-5 h-5 ${theme.accent}`} />
                    </div>

                    <div className="space-y-2 text-center py-4">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-[#060c1a] border border-[#e0c588]/30 flex items-center justify-center font-black text-2xl text-[#f4e5be] shadow-inner">
                        {p.name ? p.name[0]?.toUpperCase() : p.slot_number}
                      </div>
                      <h3 className="text-lg font-black text-white leading-tight truncate">{p.name || `Thí sinh ${p.slot_number}`}</h3>
                      <p className="text-xs text-slate-400 font-medium leading-snug">{p.school_name || "Đơn vị đại diện"}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">ĐIỂM HIỆN TẠI:</span>
                      <span className="font-mono text-2xl font-black text-[#e0c588]">{p.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE: TOÀN BỘ 4 VÒNG THI ĐẤU (RULES_ALL) */}
        {currentMode === "rules_all" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-[#e0c588] uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Layers className="w-4 h-4 text-[#e0c588]" /> THỂ LỆ TỔNG QUAN
              </span>
              <h2 className="text-3xl font-black text-white uppercase">CẤU TRÚC 4 VÒNG THI ĐẤU</h2>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {roundRulesData.map((r) => (
                <div
                  key={r.roundNum}
                  className="bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#e0c588] transition-all"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg bg-[#060c1a] text-[#e0c588] border border-[#e0c588]/40">
                      VÒNG {r.roundNum}
                    </span>
                    <h3 className="text-base font-black text-white leading-snug">{r.title.replace(/^VÒNG \d:\s*/, "")}</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{r.subtitle}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="p-2 rounded-xl bg-[#060c1a] border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-500 uppercase block font-mono">THỜI GIAN:</span>
                      <span className="text-xs font-bold text-[#f4e5be]">{r.time}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#060c1a] border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-500 uppercase block font-mono">ĐIỂM THƯỞNG:</span>
                      <span className="text-xs font-bold text-emerald-400">{r.scoring}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE: LUẬT THI RIÊNG LẺ TỪNG VÒNG (RULES_1, RULES_2, RULES_3, RULES_4) */}
        {["rules_1", "rules_2", "rules_3", "rules_4"].includes(currentMode) && (
          <div className="max-w-4xl mx-auto space-y-6 w-full">
            {(() => {
              const roundIdx = parseInt(currentMode.replace("rules_", ""), 10) - 1;
              const rule = roundRulesData[roundIdx] || roundRulesData[0];

              return (
                <div className="bg-[#091326] border-2 border-[#e0c588]/40 rounded-3xl p-8 space-y-6 shadow-2xl">
                  <div className="border-b border-slate-800 pb-4 text-center space-y-1">
                    <span className="text-xs font-mono font-bold text-[#e0c588] uppercase tracking-widest">
                      THỂ LỆ CHI TIẾT
                    </span>
                    <h2 className="text-3xl font-black text-white uppercase">{rule.title}</h2>
                    <p className="text-sm text-slate-400 font-medium">{rule.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-[#060c1a] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">THỜI GIAN LÀM BÀI:</span>
                      <span className="text-sm font-black text-[#f4e5be]">{rule.time}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#060c1a] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">CƠ CHẾ ĐIỂM SỐ:</span>
                      <span className="text-sm font-black text-emerald-400">{rule.scoring}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {rule.rules.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#060c1a] border border-slate-800 text-slate-200">
                        <span className="w-7 h-7 rounded-lg bg-[#e0c588]/20 border border-[#e0c588]/40 text-[#f4e5be] font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold leading-relaxed pt-0.5">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* SLIDE: BẢNG VÀNG VINH DANH & TRAO GIẢI */}
        {currentMode === "leaderboard" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-[#e0c588] uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#e0c588]" /> BẢNG TỔNG SẮP CHUNG CUỘC
              </span>
              <h2 className="text-3xl font-black text-white uppercase">VINH DANH NHÀ VÔ ĐỊCH</h2>
            </div>

            <div className="grid grid-cols-4 gap-4 items-end">
              {sortedPlayers.map((p, rankIdx) => {
                const isChampion = rankIdx === 0;
                const rankLabels = ["QUÁN QUÂN", "Á QUÂN", "HẠNG BA", "HẠNG TƯ"];
                const rankColors = [
                  "border-[#e0c588] bg-gradient-to-b from-[#1c1508] to-[#091326] shadow-[#e0c588]/20",
                  "border-slate-400 bg-[#091326]",
                  "border-amber-700/60 bg-[#091326]",
                  "border-slate-800 bg-[#060c1a]",
                ];

                return (
                  <div
                    key={p.slot_number}
                    className={`rounded-3xl border-2 p-5 text-center space-y-4 shadow-2xl ${rankColors[rankIdx]} ${
                      isChampion ? "scale-105 ring-2 ring-[#e0c588]/40 -translate-y-2" : ""
                    }`}
                  >
                    <div className="flex justify-center">
                      {isChampion ? (
                        <div className="p-3 rounded-full bg-[#e0c588]/20 border border-[#e0c588]">
                          <Crown className="w-8 h-8 text-[#e0c588]" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-slate-400">
                          HẠNG {rankIdx + 1}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-[#e0c588] uppercase block">
                        {rankLabels[rankIdx]} • MÁY {p.slot_number}
                      </span>
                      <h3 className="text-base font-black text-white leading-tight truncate">{p.name || `Thí sinh ${p.slot_number}`}</h3>
                      <p className="text-[11px] text-slate-400 truncate">{p.school_name || "Trường THPT"}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/50 border border-slate-800">
                      <span className="font-mono text-3xl font-black text-[#e0c588] tabular-nums">
                        {p.score}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase">ĐIỂM</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE: MÀN HÌNH THI ĐẤU CÂU HỎI */}
        {currentMode === "question" && (
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

            {/* VÒNG 2: BẢNG Ô CHỮ VƯỢT CHƯỚNG NGẠI VẬT TOÀN DIỆN (OLYMPIA MATRIX VTV3) */}
            {isRound2VCNV && currentRound && (
              <div className="bg-[#091326] border-2 border-[#e0c588]/50 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#e0c588]/20 border border-[#e0c588]/40">
                      <Lightbulb className="w-5 h-5 text-[#e0c588]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#e0c588] uppercase tracking-wider">
                        BẢNG Ô CHỮ VƯỢT CHƯỚNG NGẠI VẬT
                      </h3>
                      <p className="text-xs text-slate-400">
                        Giải mã 4 hàng ngang để tìm ra Từ Khóa Bí Mật của chương trình
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#060c1a] border border-[#e0c588]/30 px-3.5 py-1.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">ĐANG CHỌN:</span>
                    <span className="text-xs font-black text-[#f4e5be]">
                      HÀNG NGANG SỐ {matchState.current_question_index + 1}
                    </span>
                  </div>
                </div>

                {/* DANH SÁCH 4 HÀNG NGANG OLYMPIA */}
                <div className="space-y-3">
                  {currentRound.questions.map((q, qIdx) => {
                    const cleanAnswer = (q.correct_answer || "OLYMPIA")
                      .toUpperCase()
                      .replace(/[^A-Z0-9À-Ỹ]/g, "");
                    const isCurrentQuestion = qIdx === matchState.current_question_index;
                    const isRowRevealed = (qIdx < matchState.current_question_index) || (isCurrentQuestion && matchState.is_revealed);

                    return (
                      <div
                        key={qIdx}
                        className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3.5 transition-all ${
                          isCurrentQuestion
                            ? "bg-[#060c1a] border-[#e0c588] ring-4 ring-[#e0c588]/20 shadow-xl shadow-[#e0c588]/10 scale-[1.01]"
                            : isRowRevealed
                            ? "bg-[#081814] border-emerald-500/50 shadow-md"
                            : "bg-[#060c1a]/70 border-slate-800/80 opacity-75"
                        }`}
                      >
                        {/* NHÃN HÀNG NGANG */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center shadow-md ${
                              isCurrentQuestion
                                ? "bg-gradient-to-br from-[#c5a059] to-[#e0c588] text-black ring-2 ring-white/50"
                                : isRowRevealed
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            #{qIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-200 hidden md:inline">
                            Hàng ngang {qIdx + 1}:
                          </span>
                        </div>

                        {/* CÁC Ô CHỮ VUÔNG LẬT MỞ */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center flex-1">
                          {Array.from({ length: cleanAnswer.length || 6 }).map((_, charIdx) => {
                            const char = cleanAnswer[charIdx] || "";
                            return (
                              <div
                                key={charIdx}
                                className={`w-9 h-11 md:w-11 md:h-13 rounded-xl border-2 font-black text-base md:text-xl flex items-center justify-center font-mono transition-all shadow-md ${
                                  isRowRevealed
                                    ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white shadow-emerald-500/40 scale-105"
                                    : isCurrentQuestion
                                    ? "bg-[#091326] border-[#e0c588]/80 text-[#e0c588] animate-pulse"
                                    : "bg-[#060c1a] border-slate-700/80 text-slate-600"
                                }`}
                              >
                                {isRowRevealed ? char : "?"}
                              </div>
                            );
                          })}
                        </div>

                        {/* SỐ LƯỢNG CHỮ CÁI */}
                        <div className="shrink-0 text-right min-w-[75px]">
                          <span className="text-[11px] font-mono font-bold text-slate-400 block">
                            {cleanAnswer.length} chữ cái
                          </span>
                          {isRowRevealed && (
                            <span className="text-[9px] font-bold text-emerald-400 uppercase">
                              ĐÃ MỞ ✔
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* KHUNG CÂU HỎI */}
            <div className="bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="absolute top-0 right-0 px-5 py-2 bg-[#e0c588]/10 border-b border-l border-[#e0c588]/30 rounded-bl-2xl text-xs font-mono font-bold text-[#e0c588]">
                +{currentQuestion?.points_correct || 10} ĐIỂM
              </div>

              <div className="space-y-3 max-w-4xl">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  {isRound2VCNV ? `CÂU HỎI HÀNG NGANG SỐ ${matchState.current_question_index + 1}:` : "NỘI DUNG CÂU HỎI:"}
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
                  {currentQuestion?.question_text || "Đang chuẩn bị câu hỏi..."}
                </h2>

                {isRound2VCNV && currentQuestion?.correct_answer && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-[#060c1a] border border-[#e0c588]/30 text-[#f4e5be] text-xs font-bold">
                    <Lightbulb className="w-3.5 h-3.5 text-[#e0c588]" /> Gợi ý: Gồm <span className="text-white font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
                  </div>
                )}
              </div>

              {/* PHƯƠNG ÁN TRẮC NGHIỆM */}
              {isMultipleChoice && currentQuestion?.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-5 mt-4 border-t border-slate-800">
                  {currentQuestion.options.map((opt, idx) => {
                    const label = ["A", "B", "C", "D"][idx] || String(idx + 1);
                    const isCorrectOpt = matchState.is_revealed && (
                      checkAnswerCorrectness(opt, currentQuestion.correct_answer) ||
                      (currentQuestion.correct_answer.startsWith(label) && currentQuestion.correct_answer.length <= 3)
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                          isCorrectOpt
                            ? "bg-emerald-950/90 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 scale-102 ring-2 ring-emerald-500/40"
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

      {/* BOTTOM 4 THÍ SINH PODIUM (AUTOMATIC REALTIME FIT & ACCURATE STATE) */}
      {currentMode === "question" && (
        <footer className="relative z-10 px-8 py-3.5 bg-[#060c1a] border-t border-slate-800/80 shrink-0">
          <div className="grid grid-cols-4 gap-3.5 max-w-6xl mx-auto">
            {matchState.players.map((player) => {
              const theme = slotThemes[player.slot_number - 1];
              const response = matchState.current_responses[player.slot_number];
              const isBuzzerWinner = matchState.buzzer_winner_slot === player.slot_number;
              const isStar = matchState.star_of_hope_slot === player.slot_number;
              const isMainPlayer = isRound4VeDich && matchState.active_player_slot === player.slot_number;

              // TỰ ĐỘNG XÁC ĐỊNH CHÍNH XÁC ĐÚNG/SAI NGAY KHI MỞ ĐÁP ÁN
              const isAnswerCorrect = response
                ? response.is_correct !== undefined
                  ? response.is_correct
                  : currentQuestion
                  ? checkAnswerCorrectness(response.answer_text, currentQuestion.correct_answer)
                  : false
                : false;

              return (
                <div
                  key={player.slot_number}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${theme.bg} ${
                    matchState.is_revealed && response
                      ? isAnswerCorrect
                        ? "border-emerald-500/90 shadow-xl shadow-emerald-500/30 ring-1 ring-emerald-400/60"
                        : "border-rose-500/80 shadow-lg shadow-rose-500/20"
                      : isBuzzerWinner
                      ? "border-rose-500 shadow-xl shadow-rose-500/30"
                      : isMainPlayer
                      ? "border-[#e0c588] shadow-xl shadow-[#e0c588]/30"
                      : theme.border
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

                  {/* TRẠNG THÁI TRẢ LỜI: SO KHỚP CHÍNH XÁC 100% */}
                  <div className={`min-h-[28px] flex items-center justify-center rounded-xl border px-2 py-0.5 transition-colors ${
                    matchState.is_revealed && response
                      ? isAnswerCorrect
                        ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
                        : "bg-rose-950/80 border-rose-500/60 text-rose-200"
                      : "bg-black/40 border-slate-800/80"
                  }`}>
                    {matchState.is_revealed && response ? (
                      <div className="flex items-center gap-1.5 truncate">
                        {isAnswerCorrect ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="text-xs font-black truncate">{response.answer_text}</span>
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
      )}
    </div>
  );
}
