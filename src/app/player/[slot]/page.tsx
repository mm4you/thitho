"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
} from "@/lib/supabase";
import { sound } from "@/lib/sounds";
import { MatchState, RealtimeEventPayload, Question } from "@/types/game";
import {
  Zap,
  Send,
  Lock,
  CheckCircle2,
  Bell,
  Star,
  Sparkles,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlayerSlotPage() {
  const params = useParams();
  const router = useRouter();
  const slotNumber = Number(params.slot) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [inputText, setInputText] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [myResponseTime, setMyResponseTime] = useState<number | null>(null);
  const [myAnswer, setMyAnswer] = useState<string>("");

  const startTimeRef = useRef<number>(Date.now());
  const timerRunningRef = useRef<boolean>(false);

  const slotThemes = [
    { name: "ĐỎ", color: "from-red-600 to-rose-700", border: "border-red-500", text: "text-red-400", bg: "bg-red-950/40" },
    { name: "XANH", color: "from-blue-600 to-cyan-700", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-950/40" },
    { name: "VÀNG", color: "from-amber-500 to-yellow-600", border: "border-amber-500", text: "text-amber-400", bg: "bg-amber-950/40" },
    { name: "LỤC", color: "from-emerald-600 to-green-700", border: "border-emerald-500", text: "text-emerald-400", bg: "bg-emerald-950/40" },
  ];

  const currentTheme = slotThemes[slotNumber - 1] || slotThemes[0];
  const me = matchState.players.find((p) => p.slot_number === slotNumber) || {
    slot_number: slotNumber,
    name: `Thí sinh ${slotNumber}`,
    score: 0,
    school_name: "Chưa kết nối",
  };

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion: Question =
    currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const roundType = currentRound?.round_type || "khoi_dong";
  const hasMyStar = matchState.star_of_hope_slot === slotNumber;

  // Xac thuc ma PIN bao mat cua may
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authSlot = localStorage.getItem("authenticated_slot");
      if (authSlot !== String(slotNumber)) {
        router.push(`/join?slot=${slotNumber}`);
      }
    }
  }, [slotNumber, router]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "START_TIMER") {
        startTimeRef.current = event.start_time || Date.now();
        timerRunningRef.current = true;
        setHasSubmitted(false);
        setInputText("");
        setMyAnswer("");
        setMyResponseTime(null);
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
      } else if (event.type === "LOCK_ANSWERS") {
        timerRunningRef.current = false;
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        const updatedPlayers = matchState.players.map((p) => {
          const res = event.results[p.slot_number];
          return res ? { ...p, score: p.score + res.points_awarded } : p;
        });
        setMatchState((prev) => ({ ...prev, is_scored: true, players: updatedPlayers }));
      } else if (event.type === "PRESS_BUZZER") {
        sound.playBuzzer();
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: event.slot_number }));
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null }));
      } else if (event.type === "TOGGLE_STAR_OF_HOPE") {
        setMatchState((prev) => ({ ...prev, star_of_hope_slot: event.slot_number }));
      } else if (event.type === "CHANGE_QUESTION") {
        setHasSubmitted(false);
        setInputText("");
        setMyAnswer("");
        setMyResponseTime(null);
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_timer_running: false,
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

  const handleSubmitAnswer = (answer: string) => {
    if (!answer.trim() || hasSubmitted || !matchState.is_timer_running || matchState.is_locked) {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    setHasSubmitted(true);
    setMyAnswer(answer.trim());
    setMyResponseTime(elapsed);

    sendGameEvent({
      type: "SUBMIT_ANSWER",
      slot_number: slotNumber,
      answer_text: answer.trim(),
      response_time_ms: elapsed,
    });
  };

  const handlePressBuzzer = () => {
    if (matchState.buzzer_winner_slot) return;
    const elapsed = Date.now() - startTimeRef.current;
    sendGameEvent({
      type: "PRESS_BUZZER",
      slot_number: slotNumber,
      press_time_ms: elapsed,
    });
  };

  const handleToggleMyStar = () => {
    const nextStar = hasMyStar ? null : slotNumber;
    sendGameEvent({
      type: "TOGGLE_STAR_OF_HOPE",
      slot_number: nextStar,
    });
  };

  const isBuzzerLocked = matchState.buzzer_winner_slot !== null;
  const amIBuzzerWinner = matchState.buzzer_winner_slot === slotNumber;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans select-none">
      {/* Top Header Thí Sinh */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between bg-[#0d121f] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${currentTheme.color} flex items-center justify-center font-black text-xl text-white shadow-lg`}>
            {slotNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase ${currentTheme.text}`}>
                BỤC {currentTheme.name}
              </span>
              {hasMyStar && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-black font-black text-[10px] animate-pulse">
                  <Star className="w-3 h-3 fill-current" /> NGÔI SAO HY VỌNG (x2)
                </span>
              )}
            </div>
            <h2 className="text-base md:text-lg font-bold text-white line-clamp-1">{me.name}</h2>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Điểm tích lũy</span>
          <span className="font-mono text-2xl md:text-3xl font-black text-amber-400">{me.score} đ</span>
        </div>
      </header>

      {/* KHU VỰC THI ĐẤU THEO CHẾ ĐỘ VÒNG CHƠI (ADAPTIVE MODE) */}
      <main className="w-full max-w-4xl mx-auto my-auto py-4 space-y-5">
        {/* THANH THÔNG TIN CHẾ ĐỘ VÒNG CHƠI */}
        <div className="flex items-center justify-between bg-[#0d121f] border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
          <span className="text-slate-400 font-bold uppercase">
            {currentRound?.title} • Câu {matchState.current_question_index + 1}
          </span>
          <span className="text-amber-400 font-mono font-bold">
            {matchState.is_timer_running ? `Đang thi đấu: ${matchState.time_left}s` : "Chờ bắt đầu"}
          </span>
        </div>

        {/* NỘI DUNG CÂU HỎI */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl text-center">
          <p className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
            {currentQuestion?.question_text || "Đang chờ Ban Giám Khảo bắt đầu câu hỏi..."}
          </p>

          {/* CHẾ ĐỘ VÒNG 4 (VỀ ĐÍCH): NÚT ĐẶT NGÔI SAO HY VỌNG */}
          {roundType === "ve_dich" && !matchState.is_timer_running && (
            <div className="pt-2">
              <button
                onClick={handleToggleMyStar}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer ${
                  hasMyStar
                    ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-500/30 scale-105"
                    : "bg-[#070a12] border border-amber-500/60 text-amber-300 hover:bg-amber-950/40"
                }`}
              >
                <Star className={`w-4 h-4 ${hasMyStar ? "fill-current" : ""}`} />
                <span>{hasMyStar ? "ĐÃ ĐẶT NGÔI SAO HY VỌNG (x2 ĐIỂM)" : "ĐẶT NGÔI SAO HY VỌNG CHO CÂU NÀY"}</span>
              </button>
            </div>
          )}
        </div>

        {/* KHU VỰC ĐIỀU KHIỂN & LÀM BÀI CỦA THÍ SINH */}
        <div className="space-y-4">
          {/* 1. NẾU LÀ CÂU HỎI TRẮC NGHIỆM A/B/C/D (VÒNG 1 KHỞI ĐỘNG) */}
          {currentQuestion?.options && currentQuestion.options.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => {
                const optKey = String.fromCharCode(65 + idx);
                const isSelected = myAnswer === optKey || myAnswer === opt;
                return (
                  <button
                    key={idx}
                    disabled={!matchState.is_timer_running || matchState.is_locked || hasSubmitted}
                    onClick={() => handleSubmitAnswer(optKey)}
                    className={`p-4 rounded-2xl border-2 text-left font-bold text-base flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                        : "bg-[#0d121f] border-slate-800 hover:border-blue-500 text-slate-200 disabled:opacity-40"
                    }`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-[#070a12] border border-slate-700 flex items-center justify-center font-black text-amber-400 shrink-0">
                      {optKey}
                    </span>
                    <span>{opt.replace(/^[A-D][\.\:\)]\s*/, "")}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* 2. NẾU LÀ CÂU HỎI TỰ LUẬN / TĂNG TỐC (VÒNG 2 & VÒNG 3 TĂNG TỐC & VÒNG 4) */
            <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!matchState.is_timer_running || matchState.is_locked || hasSubmitted}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(inputText)}
                  placeholder={
                    hasSubmitted
                      ? "Đã nộp bài thành công!"
                      : matchState.is_timer_running
                      ? "Gõ đáp án và bấm Enter / Nộp bài..."
                      : "Đang chờ mở khóa thời gian..."
                  }
                  className="flex-1 h-14 bg-[#070a12] border border-slate-700 focus:border-blue-500 rounded-2xl px-5 text-base font-bold text-white uppercase placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
                />
                <button
                  disabled={!matchState.is_timer_running || matchState.is_locked || hasSubmitted || !inputText.trim()}
                  onClick={() => handleSubmitAnswer(inputText)}
                  className="h-14 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-lg shadow-blue-600/20"
                >
                  <Send className="w-4 h-4" />
                  <span>NỘP BÀI</span>
                </button>
              </div>

              {hasSubmitted && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-xl flex items-center justify-between text-xs text-emerald-400 font-bold animate-in fade-in">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Đã nộp: <strong className="uppercase text-white">{myAnswer}</strong>
                  </span>
                  <span className="font-mono">{((myResponseTime || 0) / 1000).toFixed(2)}s</span>
                </div>
              )}
            </div>
          )}

          {/* 3. NÚT BẤM CHUÔNG GIÀNH QUYỀN / CƯỚP ĐIỂM (DÙNG CHO VÒNG 2 & VÒNG 4) */}
          <div className="pt-2">
            <button
              onClick={handlePressBuzzer}
              disabled={isBuzzerLocked || !matchState.is_timer_running}
              className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all cursor-pointer ${
                amIBuzzerWinner
                  ? "bg-emerald-500 text-black animate-bounce scale-105"
                  : isBuzzerLocked
                  ? "bg-slate-900 border border-slate-800 text-slate-600 opacity-50 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:scale-[1.02] text-white shadow-red-600/30"
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>
                {amIBuzzerWinner
                  ? "BẠN ĐÃ GIÀNH ĐƯỢC QUYỀN TRẢ LỜI!"
                  : isBuzzerLocked
                  ? `TS ${matchState.buzzer_winner_slot} ĐÃ BẤM TRƯỚC`
                  : "BẤM CHUÔNG GIÀNH QUYỀN TRẢ LỜI"}
              </span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto text-center text-xs text-slate-600 font-medium">
        Mã phòng: <span className="font-mono text-slate-400">OLYMQUIZ-ARENA</span> • Máy đấu #{slotNumber}
      </footer>
    </div>
  );
}