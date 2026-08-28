"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
} from "@/lib/supabase";
import { sound } from "@/lib/sounds";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Send,
  CheckCircle2,
  Zap,
  Edit2,
  Star,
  Crown,
  User,
  Clock,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

function countLettersOnly(str: string): number {
  if (!str) return 0;
  return str.replace(/\s+/g, "").length;
}

export default function PlayerPage() {
  const router = useRouter();
  const params = useParams();
  const rawSlot = params?.slot;
  const slotNumber = (Math.max(1, Math.min(4, Number(rawSlot) || 1))) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [answerInput, setAnswerInput] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [submittedTimeMs, setSubmittedTimeMs] = useState<number>(0);
  const [timerStartTime, setTimerStartTime] = useState<number>(0);

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editSchool, setEditSchool] = useState<string>("");

  const slotThemes = [
    { name: "MÁY 1", border: "border-rose-500/50", accent: "text-rose-400", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
    { name: "MÁY 2", border: "border-cyan-500/50", accent: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
    { name: "MÁY 3", border: "border-amber-500/50", accent: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    { name: "MÁY 4", border: "border-violet-500/50", accent: "text-violet-400", badge: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  ];

  const currentTheme = slotThemes[slotNumber - 1] || slotThemes[0];
  const me = matchState.players.find((p) => p.slot_number === slotNumber);
  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const isMultipleChoice = currentQuestion?.question_type === "multiple_choice" || (currentQuestion?.options && currentQuestion.options.length > 0);
  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const isMyMainTurnInRound4 = isRound4VeDich && matchState.active_player_slot === slotNumber;
  const isStarChosenByMe = matchState.star_of_hope_slot === slotNumber;
  const isBuzzerWinner = matchState.buzzer_winner_slot === slotNumber;

  // ĐIỀU KIỆN MỞ KHÓA THAO TÁC: CHỈ KHI TIMER ĐANG CHẠY VÀ CHƯA BỊ KHÓA / CHƯA STANDBY
  const canInteract = matchState.is_timer_running && !matchState.is_locked && !matchState.is_standby;

  useEffect(() => {
    if (me) {
      setEditName(me.name);
      setEditSchool(me.school_name || "");
    }
  }, [me?.name, me?.school_name]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "START_TIMER") {
        setTimerStartTime(event.start_time);
        setHasSubmitted(false);
        setAnswerInput("");
        setSubmittedAnswer("");
        setSubmittedTimeMs(0);
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
      } else if (event.type === "LOCK_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        const myResult = event.results[slotNumber];
        if (myResult?.is_correct) {
          sound.playCorrect();
        } else if (myResult && !myResult.is_correct) {
          sound.playWrong();
        }
        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            return res ? { ...p, score: Math.max(0, p.score + res.points_awarded) } : p;
          });
          return { ...prev, players: updatedPlayers, is_scored: true };
        });
      } else if (event.type === "PRESS_BUZZER") {
        sound.playBuzzer();
        setMatchState((prev) => ({
          ...prev,
          buzzer_winner_slot: event.slot_number,
          buzzer_winner_time_ms: event.press_time_ms,
        }));
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null, buzzer_winner_time_ms: null }));
      } else if (event.type === "TOGGLE_STAR_OF_HOPE") {
        setMatchState((prev) => ({ ...prev, star_of_hope_slot: event.slot_number }));
      } else if (event.type === "SET_ACTIVE_PLAYER") {
        setMatchState((prev) => ({ ...prev, active_player_slot: event.slot_number }));
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, score: Math.max(0, p.score + event.delta) } : p
          ),
        }));
      } else if (event.type === "UPDATE_PLAYER_INFO") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, name: event.name, school_name: event.school_name } : p
          ),
        }));
      } else if (event.type === "CHANGE_QUESTION") {
        setHasSubmitted(false);
        setAnswerInput("");
        setSubmittedAnswer("");
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
  }, [slotNumber]);

  // Nộp đáp án (Dùng cho cả Trắc nghiệm & Tự luận)
  const submitAnswer = (selectedText: string) => {
    if (!canInteract || hasSubmitted) return;

    const timeSpent = timerStartTime > 0 ? Date.now() - timerStartTime : 1500;
    const finalAnswer = selectedText.trim();
    if (!finalAnswer) return;

    setHasSubmitted(true);
    setSubmittedAnswer(finalAnswer);
    setSubmittedTimeMs(timeSpent);
    sound.playTick();

    sendGameEvent({
      type: "SUBMIT_ANSWER",
      slot_number: slotNumber,
      answer_text: finalAnswer,
      response_time_ms: timeSpent,
    });
  };

  const handlePressBuzzer = () => {
    if (matchState.buzzer_winner_slot) return;
    const pressTime = timerStartTime > 0 ? Date.now() - timerStartTime : Date.now();
    sound.playBuzzer();
    sendGameEvent({ type: "PRESS_BUZZER", slot_number: slotNumber, press_time_ms: pressTime });
  };

  const handleToggleStarOfHope = () => {
    if (!isRound4VeDich) return;
    const nextSlot = isStarChosenByMe ? null : slotNumber;
    sendGameEvent({ type: "TOGGLE_STAR_OF_HOPE", slot_number: nextSlot });
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: slotNumber,
      name: editName.trim(),
      school_name: editSchool.trim(),
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#05070e] text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans select-none max-w-xl mx-auto w-full">
      {/* HEADER BỤC ĐẤU */}
      <header className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-black px-3 py-1 rounded-xl border ${currentTheme.badge}`}>
            MÁY {slotNumber}
          </span>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm md:text-base font-bold text-white truncate max-w-[150px]">
                {me?.name || `Thí sinh ${slotNumber}`}
              </h2>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-slate-500 hover:text-cyan-400 p-1 transition-colors"
                title="Đổi tên"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
              {me?.school_name || "Chưa cập nhật trường"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">ĐIỂM SỐ:</span>
          <span className="font-mono text-2xl md:text-3xl font-black text-cyan-400 tabular-nums">
            {me?.score || 0}
          </span>
        </div>
      </header>

      {/* MODAL SỬA THÔNG TIN */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0b101c] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" /> CẬP NHẬT THÔNG TIN THÍ SINH
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#060810] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Trường đại diện:</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full bg-[#060810] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveProfile} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-10 rounded-xl cursor-pointer">
                Lưu Thông Tin
              </Button>
              <Button variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-slate-400 text-xs h-10">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KHUNG CÂU HỎI THỜI GIAN THỰC */}
      <main className="my-5 space-y-4">
        {/* VÒNG 4: NÚT ĐẶT SAO */}
        {isRound4VeDich && isMyMainTurnInRound4 && (
          <div className="bg-gradient-to-r from-violet-950/60 via-indigo-950/40 to-violet-950/60 border border-violet-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-violet-400" />
              <div>
                <span className="text-xs font-black text-violet-300 uppercase block">LƯỢT THI CỦA BẠN!</span>
                <span className="text-[11px] text-slate-400 font-medium">Bạn có thể chọn Ngôi Sao Hy Vọng</span>
              </div>
            </div>

            <Button
              onClick={handleToggleStarOfHope}
              className={`font-black text-xs h-9 px-3.5 rounded-xl cursor-pointer transition-all ${
                isStarChosenByMe
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/40"
                  : "bg-black/40 border border-violet-500/50 text-violet-300 hover:bg-violet-600 hover:text-white"
              }`}
            >
              <Star className={`w-3.5 h-3.5 mr-1 ${isStarChosenByMe ? "fill-white" : ""}`} />
              {isStarChosenByMe ? "ĐÃ ĐẶT SAO" : "ĐẶT SAO"}
            </Button>
          </div>
        )}

        <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {currentRound.title} • CÂU {matchState.current_question_index + 1}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              +{currentQuestion?.points_correct || 10}đ
            </span>
          </div>

          <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">
            {currentQuestion?.question_text || "Đang chờ Ban Giám Khảo mở câu hỏi..."}
          </h3>

          {isRound2VCNV && currentQuestion?.correct_answer && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              💡 Gợi ý: Gồm <span className="text-white font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
            </div>
          )}
        </div>

        {/* VÒNG 4: NÚT BẤM CHUÔNG CƯỚP ĐIỂM (CHO 3 THÍ SINH CÒN LẠI) */}
        {isRound4VeDich && !isMyMainTurnInRound4 && (
          <div className="pt-1">
            <Button
              onClick={handlePressBuzzer}
              disabled={!canInteract || !!matchState.buzzer_winner_slot}
              className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider cursor-pointer shadow-xl transition-all ${
                isBuzzerWinner
                  ? "bg-emerald-600 text-white shadow-emerald-500/30 scale-102"
                  : matchState.buzzer_winner_slot
                  ? "bg-slate-900 text-slate-600 border border-slate-800 opacity-60"
                  : !canInteract
                  ? "bg-slate-900 text-slate-600 border border-slate-800 opacity-40 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/30 animate-pulse active:scale-98"
              }`}
            >
              <Zap className="w-5 h-5 mr-2 fill-current" />
              {isBuzzerWinner
                ? "BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!"
                : matchState.buzzer_winner_slot
                ? "ĐÃ CÓ THÍ SINH BẤM CHUÔNG"
                : !canInteract
                ? "CHỜ BẮT ĐẦU ĐẾM GIỜ ĐỂ BẤM CHUÔNG"
                : "BẤM CHUÔNG CƯỚP ĐIỂM NGAY"}
            </Button>
          </div>
        )}

        {/* KHU VỰC TRẢ LỜI CÂU HỎI */}
        <div className="space-y-3 pt-1">
          {hasSubmitted ? (
            /* ĐÃ NỘP BÀI */
            <div className="bg-cyan-950/30 border border-cyan-500/50 rounded-2xl p-5 text-center space-y-1.5 shadow-xl animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto" />
              <h4 className="text-sm font-black text-white uppercase">ĐÃ NỘP BÀI THÀNH CÔNG</h4>
              <p className="font-mono text-base font-bold text-cyan-300 uppercase">
                &ldquo;{submittedAnswer}&rdquo;
              </p>
              <span className="text-[11px] text-slate-500 font-mono block">
                Thời gian nộp: {(submittedTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          ) : !canInteract ? (
            /* KHÓA: ĐANG CHỜ GIÁM KHẢO BẤM BẮT ĐẦU ĐẾM GIỜ */
            <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto animate-spin" style={{ animationDuration: "6s" }} />
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                ĐANG CHỜ BAN GIÁM KHẢO BẮT ĐẦU ĐẾM GIỜ...
              </h4>
              <p className="text-xs text-slate-600">
                Khi đồng hồ đếm ngược bắt đầu chạy, bạn mới có thể bấm chọn hoặc gửi câu trả lời.
              </p>
            </div>
          ) : isMultipleChoice && currentQuestion?.options ? (
            /* VÒNG 1 (TRẮC NGHIỆM): 4 NÚT BẤM A, B, C, D 1-CHẠM */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const label = ["A", "B", "C", "D"][idx] || String(idx + 1);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => submitAnswer(opt)}
                    className="p-3.5 rounded-xl bg-[#090d16] hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-400 text-left transition-all cursor-pointer flex items-center gap-3 group active:scale-98 shadow-md"
                  >
                    <span className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-cyan-500 group-hover:text-black text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 transition-colors">
                      {label}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-white group-hover:text-cyan-200 leading-snug">
                      {opt.replace(/^[A-D]\.\s*/, "")}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* VÒNG TỰ LUẬN (NHẬP CHỮ) */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer(answerInput);
              }}
              className="space-y-2.5"
            >
              <input
                type="text"
                autoFocus
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full bg-[#090d16] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none shadow-lg"
              />

              <Button
                type="submit"
                disabled={!answerInput.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs h-12 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-cyan-600/20 disabled:opacity-30 active:scale-98 transition-all"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> NỘP CÂU TRẢ LỜI
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center py-2">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 font-mono">
          ← Quay lại Trang Chủ
        </Link>
      </footer>
    </div>
  );
}
