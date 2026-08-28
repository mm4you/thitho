"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Lock,
  Zap,
  Edit2,
  Star,
  Check,
  Flame,
  Award,
  Crown,
  Home,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

function countLettersOnly(str: string): number {
  if (!str) return 0;
  return str.replace(/\s+/g, "").length;
}

export default function PlayerPage({ params }: { params: Promise<{ slot: string }> }) {
  const resolvedParams = use(params);
  const slotNumber = Number(resolvedParams.slot) as 1 | 2 | 3 | 4;
  const router = useRouter();

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
    { name: "ĐỎ", border: "border-red-500", glow: "shadow-red-500/30", text: "text-red-400", bg: "bg-red-950/40", badge: "bg-red-500 text-white" },
    { name: "XANH", border: "border-blue-500", glow: "shadow-blue-500/30", text: "text-blue-400", bg: "bg-blue-950/40", badge: "bg-blue-500 text-white" },
    { name: "VÀNG", border: "border-amber-500", glow: "shadow-amber-500/30", text: "text-amber-400", bg: "bg-amber-950/40", badge: "bg-amber-500 text-black" },
    { name: "LỤC", border: "border-emerald-500", glow: "shadow-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-950/40", badge: "bg-emerald-500 text-white" },
  ];

  const currentTheme = slotThemes[slotNumber - 1] || slotThemes[0];
  const me = matchState.players.find((p) => p.slot_number === slotNumber);
  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const isMyMainTurnInRound4 = isRound4VeDich && matchState.active_player_slot === slotNumber;
  const isStarChosenByMe = matchState.star_of_hope_slot === slotNumber;
  const isBuzzerWinner = matchState.buzzer_winner_slot === slotNumber;

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

  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || hasSubmitted || matchState.is_locked) return;

    const timeSpent = timerStartTime > 0 ? Date.now() - timerStartTime : 1500;
    const finalAnswer = answerInput.trim();

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
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans select-none max-w-2xl mx-auto w-full">
      {/* HEADER BỤC ĐẤU */}
      <header className="bg-[#0b1020] border-2 border-slate-800 rounded-3xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black px-3 py-1.5 rounded-xl uppercase shadow-md ${currentTheme.badge}`}>
            MÁY {slotNumber}
          </span>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate max-w-[160px]">
                {me?.name || `Thí sinh ${slotNumber}`}
              </h2>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-slate-500 hover:text-slate-300 p-1"
                title="Sửa họ tên"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[160px]">
              {me?.school_name || "Chưa cập nhật trường"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">ĐIỂM HIỆN TẠI:</span>
          <span className="font-mono text-3xl font-black text-amber-400 tabular-nums">
            {me?.score || 0}
          </span>
        </div>
      </header>

      {/* MODAL SỬA THÔNG TIN */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d121f] border-2 border-blue-500 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> CẬP NHẬT THÔNG TIN THÍ SINH
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#070a14] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Trường đại diện:</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full bg-[#070a14] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveProfile} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 rounded-xl">
                Lưu Thay Đổi
              </Button>
              <Button variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-slate-400 text-xs h-10">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KHUNG CÂU HỎI THỜI GIAN THỰC */}
      <main className="my-6 space-y-4">
        {/* VÒNG 4: NÚT ĐẶT SAO HOẶC THÔNG BÁO */}
        {isRound4VeDich && isMyMainTurnInRound4 && (
          <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-black text-amber-300 uppercase block">ĐẾN LƯỢT THI CỦA BẠN!</span>
                <span className="text-[11px] text-amber-200/80 font-medium">Bạn có thể chọn Ngôi Sao Hy Vọng</span>
              </div>
            </div>

            <Button
              onClick={handleToggleStarOfHope}
              className={`font-black text-xs h-9 px-4 rounded-xl cursor-pointer ${
                isStarChosenByMe
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-400/40"
                  : "bg-black/50 border border-amber-400/80 text-amber-300 hover:bg-amber-400 hover:text-black"
              }`}
            >
              <Star className={`w-4 h-4 mr-1.5 ${isStarChosenByMe ? "fill-black" : ""}`} />
              {isStarChosenByMe ? "ĐÃ ĐẶT SAO" : "ĐẶT SAO HY VỌNG"}
            </Button>
          </div>
        )}

        <div className="bg-[#0b1020] border-2 border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              {currentRound.title} - CÂU {matchState.current_question_index + 1}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">
              +{currentQuestion?.points_correct || 10}đ
            </span>
          </div>

          <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">
            {currentQuestion?.question_text || "Đang chờ Ban Giám Khảo mở câu hỏi..."}
          </h3>

          {isRound2VCNV && currentQuestion?.correct_answer && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-bold">
              💡 Gợi ý: Gồm <span className="text-amber-400 font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
            </div>
          )}
        </div>

        {/* VÒNG 4: NÚT BẤM CHUÔNG CƯỚP ĐIỂM (CHO 3 THÍ SINH CÒN LẠI) */}
        {isRound4VeDich && !isMyMainTurnInRound4 && (
          <div className="pt-2">
            <Button
              onClick={handlePressBuzzer}
              disabled={!!matchState.buzzer_winner_slot}
              className={`w-full h-16 rounded-2xl font-black text-base uppercase tracking-wider cursor-pointer shadow-2xl transition-all ${
                isBuzzerWinner
                  ? "bg-emerald-600 text-white shadow-emerald-500/50 scale-105"
                  : matchState.buzzer_winner_slot
                  ? "bg-slate-800 text-slate-500 opacity-60"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 animate-pulse active:scale-95"
              }`}
            >
              <Zap className="w-6 h-6 mr-2 fill-current" />
              {isBuzzerWinner
                ? "BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!"
                : matchState.buzzer_winner_slot
                ? "NGƯỜI KHÁC ĐÃ BẤM CHUÔNG"
                : "BẤM CHUÔNG CƯỚP ĐIỂM NGAY"}
            </Button>
          </div>
        )}

        {/* KHU VỰC NHẬP ĐÁP ÁN */}
        <form onSubmit={handleSubmitAnswer} className="space-y-3 pt-2">
          {hasSubmitted ? (
            <div className="bg-emerald-950/60 border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-2 shadow-2xl animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-white uppercase">BẠN ĐÃ NỘP BÀI THÀNH CÔNG!</h4>
              <p className="font-mono text-lg font-bold text-amber-400 uppercase">
                &ldquo;{submittedAnswer}&rdquo;
              </p>
              <span className="text-xs text-slate-400 font-mono block">
                Thời gian nộp: {(submittedTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                disabled={matchState.is_locked}
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder={matchState.is_locked ? "Đã hết thời gian nộp bài" : "Gõ câu trả lời của bạn vào đây..."}
                className="w-full bg-[#0b1020] border-2 border-slate-700 focus:border-blue-500 rounded-2xl px-5 py-4 text-base md:text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none shadow-xl disabled:opacity-50"
              />

              <Button
                type="submit"
                disabled={matchState.is_locked || !answerInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm h-14 uppercase tracking-wider rounded-2xl cursor-pointer shadow-xl shadow-blue-600/30 disabled:opacity-40 active:scale-98 transition-all"
              >
                <Send className="w-4 h-4 mr-2" /> NỘP CÂU TRẢ LỜI NGAY
              </Button>
            </div>
          )}
        </form>
      </main>

      {/* FOOTER */}
      <footer className="text-center py-2">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
          ← Quay lại Trang Chủ
        </Link>
      </footer>
    </div>
  );
}
