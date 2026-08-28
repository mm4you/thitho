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
  KeyRound,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

function countLettersOnly(str: string): number {
  if (!str) return 0;
  return str.replace(/\s+/g, "").length;
}

function normalizeInputCode(code: string): string {
  return (code || "").toUpperCase().replace(/[\s\-_–—]/g, "").trim();
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

  // XÁC THỰC MÃ THÍ SINH
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editSchool, setEditSchool] = useState<string>("");

  const me = matchState.players.find((p) => p.slot_number === slotNumber);
  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const isMultipleChoice = currentQuestion?.question_type === "multiple_choice" || (currentQuestion?.options && currentQuestion.options.length > 0);
  const isRound2VCNV = matchState.current_round_index === 1;
  const isRound4VeDich = matchState.current_round_index === 3;
  const isMyMainTurnInRound4 = isRound4VeDich && matchState.active_player_slot === slotNumber;
  const isStarChosenByMe = matchState.star_of_hope_slot === slotNumber;
  const isBuzzerWinner = matchState.buzzer_winner_slot === slotNumber;

  // BẢNG MÀU 4 BỤC ĐẤU NOBEL ACADEMIC
  const slotThemes = [
    { name: "MÁY 1", border: "border-rose-500/40", accent: "text-rose-400", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
    { name: "MÁY 2", border: "border-blue-500/40", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { name: "MÁY 3", border: "border-[#e0c588]/40", accent: "text-[#e0c588]", badge: "bg-[#e0c588]/20 text-[#f4e5be] border-[#e0c588]/40" },
    { name: "MÁY 4", border: "border-emerald-500/40", accent: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  ];
  const currentTheme = slotThemes[slotNumber - 1] || slotThemes[0];

  // KIỂM TRA MÃ PIN KHI VÀO HOẶC KHI ADMIN RESET MÃ MỚI
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPin = sessionStorage.getItem(`player_pin_slot_${slotNumber}`);
      const requiredPin = me?.pin_code || "";

      if (savedPin && requiredPin && normalizeInputCode(savedPin) === normalizeInputCode(requiredPin)) {
        setIsAuthenticated(true);
      } else if (!requiredPin) {
        setIsAuthenticated(true);
      } else {
        // Mã cũ bị mất quyền khi Admin reset
        setIsAuthenticated(false);
      }
    }
  }, [slotNumber, me?.pin_code]);

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

  // XÁC THỰC MÃ THÍ SINH
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEntered = normalizeInputCode(enteredPin);
    const cleanRequired = normalizeInputCode(me?.pin_code || "");

    if (!cleanRequired || cleanEntered === cleanRequired) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`player_pin_slot_${slotNumber}`, enteredPin.trim());
      }
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("Mã bảo mật không chính xác hoặc đã bị Ban Tổ Chức thay đổi!");
    }
  };

  const canInteract = matchState.is_timer_running && !matchState.is_locked && !matchState.is_standby;

  // NỘP BÀI
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
    if (!canInteract || matchState.buzzer_winner_slot) return;
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

  // NẾU CHƯA NHẬP MÃ THÍ SINH: HIỂN THỊ MÀN HÌNH KHÓA MÃ PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-[#060c1a] text-slate-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-sm bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-7 shadow-2xl space-y-6 text-center">
          <div className="flex justify-center">
            <BrandLogo size="md" showWordmark={false} />
          </div>

          <div className="space-y-1.5">
            <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg border ${currentTheme.badge}`}>
              MÁY THI ĐẤU SỐ {slotNumber}
            </span>
            <h2 className="text-lg font-black text-white uppercase tracking-tight pt-1">
              XÁC THỰC MÃ BỤC ĐẤU
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Nhập mã PIN bảo mật do Ban Giám Khảo cấp để mở khóa máy thi đấu này
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1.5 uppercase">
                MÃ BẢO MẬT (PIN):
              </label>
              <input
                type="text"
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value.toUpperCase());
                  setPinError("");
                }}
                placeholder="Nhập mã (Ví dụ: 1111)..."
                className="w-full bg-[#060c1a] border border-slate-700 focus:border-[#e0c588] rounded-xl px-4 py-3 text-center text-base font-mono font-black text-[#f4e5be] uppercase placeholder:text-slate-600 focus:outline-none tracking-widest"
              />
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20"
            >
              MỞ KHÓA BỤC THI ĐẤU <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="pt-2">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 font-mono">
              ← Quay lại Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#060c1a] text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans select-none max-w-xl mx-auto w-full">
      {/* HEADER BỤC ĐẤU */}
      <header className="bg-[#091326] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
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
                className="text-slate-500 hover:text-[#e0c588] p-1 transition-colors"
                title="Đổi tên"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
              {me?.school_name || "Chưa cập nhật trường"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">ĐIỂM SỐ:</span>
          <span className="font-mono text-2xl md:text-3xl font-black text-[#e0c588] tabular-nums">
            {me?.score || 0}
          </span>
        </div>
      </header>

      {/* MODAL SỬA THÔNG TIN */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#091326] border border-[#e0c588]/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#e0c588]" /> CẬP NHẬT THÔNG TIN THÍ SINH
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#060c1a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[#e0c588]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Trường đại diện:</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full bg-[#060c1a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#e0c588]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveProfile} className="flex-1 bg-[#c5a059] hover:bg-[#b48f48] text-black font-bold text-xs h-10 rounded-xl cursor-pointer">
                Lưu Thông Tin
              </Button>
              <Button variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-slate-400 text-xs h-10">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRẠNG THÁI TOÀN CẢNH KHI GIÀNH QUYỀN TRẢ LỜI */}
      {isBuzzerWinner && (
        <div className="my-3 bg-gradient-to-r from-emerald-900/80 via-emerald-800/90 to-emerald-900/80 border-2 border-emerald-400 rounded-2xl p-4 text-center shadow-2xl animate-pulse">
          <span className="text-xs font-mono font-black uppercase text-emerald-200 block">🎙️ BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!</span>
          <span className="text-sm font-black text-white uppercase">HÃY PHÁT BIỂU CÂU TRẢ LỜI VỚI BAN GIÁM KHẢO</span>
        </div>
      )}

      {/* KHUNG CÂU HỎI THỜI GIAN THỰC */}
      <main className="my-4 space-y-4">
        {/* VÒNG 4: NÚT ĐẶT SAO */}
        {isRound4VeDich && isMyMainTurnInRound4 && (
          <div className="bg-[#091326] border border-[#e0c588]/40 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#e0c588]" />
              <div>
                <span className="text-xs font-black text-[#f4e5be] uppercase block">LƯỢT THI CỦA BẠN!</span>
                <span className="text-[11px] text-slate-400 font-medium">Bạn có thể chọn Ngôi Sao Hy Vọng</span>
              </div>
            </div>

            <Button
              onClick={handleToggleStarOfHope}
              className={`font-black text-xs h-9 px-3.5 rounded-xl cursor-pointer transition-all ${
                isStarChosenByMe
                  ? "bg-[#e0c588] text-black shadow-lg shadow-[#e0c588]/30"
                  : "bg-[#060c1a] border border-[#e0c588]/50 text-[#e0c588] hover:bg-[#c5a059] hover:text-black"
              }`}
            >
              <Star className={`w-3.5 h-3.5 mr-1 ${isStarChosenByMe ? "fill-black" : ""}`} />
              {isStarChosenByMe ? "ĐÃ ĐẶT SAO" : "ĐẶT SAO"}
            </Button>
          </div>
        )}

        <div className="bg-[#091326] border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <span className="text-xs font-bold text-[#e0c588] uppercase tracking-wider">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#060c1a] border border-[#e0c588]/30 text-[#f4e5be] text-xs font-bold">
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
            <div className="bg-[#091326] border border-[#e0c588]/60 rounded-2xl p-5 text-center space-y-1.5 shadow-xl animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-[#e0c588] mx-auto" />
              <h4 className="text-sm font-black text-white uppercase">ĐÃ NỘP BÀI THÀNH CÔNG</h4>
              <p className="font-mono text-base font-bold text-[#f4e5be] uppercase">
                &ldquo;{submittedAnswer}&rdquo;
              </p>
              <span className="text-[11px] text-slate-500 font-mono block">
                Thời gian nộp: {(submittedTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          ) : !canInteract ? (
            /* KHÓA: ĐANG CHỜ GIÁM KHẢO BẤM BẮT ĐẦU ĐẾM GIỜ */
            <div className="bg-[#091326] border border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto animate-spin" style={{ animationDuration: "6s" }} />
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                ĐANG CHỜ BAN GIÁM KHẢO BẮT ĐẦU ĐẾM GIỜ...
              </h4>
              <p className="text-xs text-slate-600">
                Khi đồng hồ đếm ngược bắt đầu chạy, bạn mới có thể bấm chọn hoặc gửi câu trả lời.
              </p>
            </div>
          ) : isMultipleChoice && currentQuestion?.options ? (
            /* VÒNG 1 (TRẮC NGHIỆM): BIG TOUCH CARDS CÔNG THÁI HỌC CHO MOBILE */
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => {
                const label = ["A", "B", "C", "D"][idx] || String(idx + 1);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => submitAnswer(opt)}
                    className="p-4 rounded-2xl bg-[#091326] hover:bg-[#0d1c3a] border-2 border-slate-700 hover:border-[#e0c588] text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] group active:scale-95 shadow-lg"
                  >
                    <span className="w-9 h-9 rounded-xl bg-[#060c1a] group-hover:bg-[#e0c588] group-hover:text-black text-[#e0c588] font-black text-base flex items-center justify-center shrink-0 transition-colors border border-slate-800">
                      {label}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#f4e5be] leading-snug mt-2">
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
                className="w-full bg-[#091326] border border-slate-700 focus:border-[#e0c588] rounded-xl px-4 py-3.5 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none shadow-lg"
              />

              <Button
                type="submit"
                disabled={!answerInput.trim()}
                className="w-full bg-[#c5a059] hover:bg-[#b48f48] text-black font-black text-xs h-12 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20 disabled:opacity-30 active:scale-98 transition-all"
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
