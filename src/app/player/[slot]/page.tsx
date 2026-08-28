"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, sendGameEvent, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Zap,
  Star,
  CheckCircle2,
  Lock,
  Edit2,
  Check,
  X,
  Volume2,
  VolumeX,
  Crown,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Lightbulb,
  Radio,
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

export default function PlayerPodiumPage() {
  const params = useParams();
  const rawSlot = params?.slot as string;
  const slotNumber = (rawSlot ? parseInt(rawSlot, 10) : 1) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [answerInput, setAnswerInput] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [submittedTimeMs, setSubmittedTimeMs] = useState<number>(0);
  const [timerStartTime, setTimerStartTime] = useState<number>(0);

  // MÃ PIN BẢO MẬT
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  // CHỈNH SỬA THÔNG TIN
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editSchool, setEditSchool] = useState<string>("");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

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
        setTimerStartTime(event.start_time || Date.now());
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
            <div className="p-3.5 rounded-2xl bg-[#e0c588]/10 border border-[#e0c588]/40">
              <KeyRound className="w-8 h-8 text-[#e0c588]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg bg-[#060c1a] text-[#e0c588] border border-[#e0c588]/40">
              BỤC ĐẤU MÁY {slotNumber}
            </span>
            <h2 className="text-xl font-bold text-white uppercase">MÃ BẢO MẬT BỤC THI</h2>
            <p className="text-xs text-slate-400">
              Vui lòng nhập mã PIN do Ban Tổ Chức cấp để mở khóa bục thi đấu này
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <input
              type="text"
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value.toUpperCase());
                setPinError("");
              }}
              placeholder="Nhập mã PIN..."
              className="w-full bg-[#060c1a] border border-slate-700 focus:border-[#e0c588] rounded-xl px-4 py-3 font-mono font-black text-center text-lg text-[#f4e5be] tracking-widest uppercase focus:outline-none"
              autoFocus
            />

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 text-left">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs h-11 uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20"
            >
              MỞ KHÓA BỤC ĐẤU
            </Button>

            <Link href="/" className="block text-xs text-slate-500 hover:text-slate-300 font-mono pt-2">
              Quay lại Trang Chủ
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#060c1a] text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans select-none relative overflow-x-hidden">
      {/* HEADER BỤC ĐẤU THÍ SINH */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showWordmark={false} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md border ${currentTheme.badge}`}>
                MÁY {slotNumber}
              </span>
              <h1 className="text-sm font-bold text-white truncate max-w-[140px] md:max-w-[200px]">
                {me?.name || `Thí sinh ${slotNumber}`}
              </h1>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                title="Đổi tên"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{me?.school_name || "Trường THPT..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ĐIỂM SỐ */}
          <div className="bg-[#091326] border border-[#e0c588]/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-md">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">ĐIỂM:</span>
            <span className="font-mono text-xl font-black text-[#e0c588] tabular-nums">
              {me?.score || 0}
            </span>
          </div>

          <button
            onClick={() => {
              const next = !isAudioMuted;
              setIsAudioMuted(next);
              sound.setMuted(next);
            }}
            className="p-2 rounded-xl bg-[#091326] border border-slate-800 text-slate-400 hover:text-white"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#e0c588]" />}
          </button>
        </div>
      </header>

      {/* POPUP CHỈNH SỬA TÊN THÍ SINH */}
      {isEditingProfile && (
        <div className="my-3 p-4 rounded-2xl bg-[#091326] border border-slate-800 space-y-3 animate-in fade-in z-20">
          <span className="text-xs font-bold text-[#e0c588] uppercase block">CẬP NHẬT THÔNG TIN THÍ SINH:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Họ và tên..."
              className="bg-[#060c1a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
            <input
              type="text"
              value={editSchool}
              onChange={(e) => setEditSchool(e.target.value)}
              placeholder="Trường / Đơn vị..."
              className="bg-[#060c1a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-xs h-8">
              Hủy
            </Button>
            <Button size="sm" onClick={handleSaveProfile} className="bg-[#c5a059] text-black font-bold text-xs h-8">
              Lưu Thông Tin
            </Button>
          </div>
        </div>
      )}

      {/* TOÀN CẢNH BÁO BẤM CHUÔNG THÀNH CÔNG */}
      {isBuzzerWinner && (
        <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 border border-white text-white text-center shadow-xl animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <Radio className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-mono font-black uppercase text-emerald-200 block">BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!</span>
          </div>
          <span className="text-sm font-black uppercase">HÃY TRẢ LỜI TRỰC TIẾP VỚI BAN GIÁM KHẢO</span>
        </div>
      )}

      {/* MAIN ARENA CHO THÍ SINH */}
      <main className="my-auto py-4 space-y-4 z-10 max-w-2xl mx-auto w-full">
        {/* NỘI DUNG CÂU HỎI */}
        <div className="bg-[#091326] border border-[#e0c588]/30 rounded-3xl p-5 md:p-6 shadow-xl space-y-3 relative">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-[10px] font-mono font-bold text-[#e0c588] uppercase">
              {currentRound?.title} • CÂU #{matchState.current_question_index + 1}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              +{currentQuestion?.points_correct || 10} ĐIỂM
            </span>
          </div>

          <h2 className="text-base md:text-lg font-bold text-white leading-relaxed">
            {matchState.is_standby ? "ĐANG CHỜ BẮT ĐẦU TRẬN ĐẤU..." : currentQuestion?.question_text || "Đang tải câu hỏi..."}
          </h2>

          {isRound2VCNV && currentQuestion?.correct_answer && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#060c1a] border border-[#e0c588]/30 text-[#f4e5be] text-[11px] font-bold">
              <Lightbulb className="w-3.5 h-3.5 text-[#e0c588]" /> Gợi ý: Gồm <span className="text-white font-black">{countLettersOnly(currentQuestion.correct_answer)}</span> chữ cái
            </div>
          )}
        </div>

        {/* KHU VỰC THAO TÁC TRẢ LỜI CỦA THÍ SINH */}
        {!canInteract ? (
          /* TRẠNG THÁI KHÓA / CHƯA ĐẾM GIỜ */
          <div className="p-6 rounded-3xl bg-[#091326]/60 border border-slate-800 text-center space-y-2">
            <div className="flex justify-center">
              <Lock className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-300 uppercase">BỤC THI ĐANG TẠM KHÓA</h3>
            <p className="text-xs text-slate-500 font-medium">
              Thao tác sẽ tự động mở khóa khi Ban Giám Khảo bấm bắt đầu đếm giờ
            </p>
          </div>
        ) : hasSubmitted ? (
          /* TRẠNG THÁI ĐÃ NỘP BÀI */
          <div className="p-6 rounded-3xl bg-[#081814] border border-emerald-500/60 text-center space-y-2 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-base font-black text-white uppercase">ĐÃ NỘP CÂU TRẢ LỜI THÀNH CÔNG!</h3>
            <p className="text-sm font-mono font-bold text-emerald-300">
              {submittedAnswer} ({(submittedTimeMs / 1000).toFixed(2)}s)
            </p>
            <span className="text-[11px] text-slate-400 block pt-1">Đang chờ Ban Giám Khảo công bố đáp án...</span>
          </div>
        ) : isMultipleChoice && currentQuestion?.options && currentQuestion.options.length > 0 ? (
          /* 4 NÚT TRẮC NGHIỆM TOUCH BIG CARDS CÔNG THÁI HỌC */
          <div className="space-y-2.5">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase block text-center">
              CHẠM VÀO 1 PHƯƠNG ÁN ĐỂ NỘP BÀI NGAY:
            </span>
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => {
                const label = ["A", "B", "C", "D"][idx] || String(idx + 1);

                return (
                  <button
                    key={idx}
                    onClick={() => submitAnswer(opt)}
                    className="min-h-[72px] md:min-h-[85px] p-3 rounded-2xl bg-[#091326] border-2 border-slate-700 active:border-[#e0c588] active:bg-[#e0c588]/10 text-left flex items-center gap-3 transition-all cursor-pointer shadow-lg active:scale-97 group"
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#060c1a] border border-[#e0c588]/40 text-[#e0c588] font-mono font-black text-lg flex items-center justify-center shrink-0 group-active:bg-[#e0c588] group-active:text-black">
                      {label}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                      {opt.replace(/^[A-D]\.\s*/, "")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Ô NHẬP TỰ LUẬN */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer(answerInput);
            }}
            className="space-y-3"
          >
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase block">
              NHẬP CÂU TRẢ LỜI CỦA BẠN:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Gõ đáp án vào đây..."
                className="flex-1 bg-[#091326] border-2 border-slate-700 focus:border-[#e0c588] rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!answerInput.trim()}
                className="bg-gradient-to-r from-[#c5a059] to-[#e0c588] hover:from-[#b48f48] hover:to-[#c5a059] text-black font-black text-xs px-6 h-auto rounded-2xl cursor-pointer shrink-0 shadow-lg shadow-[#c5a059]/20"
              >
                NỘP BÀI
              </Button>
            </div>
          </form>
        )}

        {/* NÚT BẤM CHUÔNG CƯỚP ĐIỂM & SAO HY VỌNG (CHỈ HIỆN Ở VÒNG 4 VỀ ĐÍCH HOẶC VÒNG 2 VCNV) */}
        {(isRound4VeDich || isRound2VCNV) && (
          <div className={`grid gap-3 pt-2 ${isRound4VeDich ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {/* NÚT CHUÔNG CƯỚP ĐIỂM */}
            <button
              onClick={handlePressBuzzer}
              disabled={!canInteract || !!matchState.buzzer_winner_slot}
              className={`h-14 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                matchState.buzzer_winner_slot
                  ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/30 active:scale-98"
              }`}
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>{matchState.buzzer_winner_slot ? "ĐÃ CÓ NGƯỜI GIÀNH CHUÔNG" : "BẤM CHUÔNG GIÀNH QUYỀN"}</span>
            </button>

            {/* NÚT SAO HY VỌNG (VÒNG 4) */}
            {isRound4VeDich && (
              <button
                onClick={handleToggleStarOfHope}
                className={`h-14 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  isStarChosenByMe
                    ? "bg-[#e0c588] text-black border-[#f4e5be] shadow-lg shadow-[#e0c588]/30"
                    : "bg-[#091326] text-[#f4e5be] border-[#e0c588]/40 hover:border-[#e0c588]"
                }`}
              >
                <Star className={`w-5 h-5 ${isStarChosenByMe ? "fill-black" : ""}`} />
                <span>{isStarChosenByMe ? "ĐÃ ĐẶT SAO HY VỌNG" : "ĐẶT NGÔI SAO HY VỌNG"}</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 pt-3 text-center text-[11px] text-slate-500 font-mono z-10">
        Bục Đấu Thí Sinh #{slotNumber} • Nobel Academic Edition
      </footer>
    </div>
  );
}
