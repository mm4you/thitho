"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Send, Lock, Edit2, X, Home, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlayerPage() {
  const params = useParams();
  const slotNumber = Number(params.slot) as 1 | 2 | 3 | 4;

  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [inputText, setInputText] = useState<string>("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [submittedTime, setSubmittedTime] = useState<number | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<number>(Date.now());
  const [buzzerPressed, setBuzzerPressed] = useState<boolean>(false);

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("");
  const [customSchool, setCustomSchool] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlayer = matchState.players.find((p) => p.slot_number === slotNumber) || {
    slot_number: slotNumber,
    name: `Thí sinh ${slotNumber}`,
    score: 0,
    school_name: "Thí sinh",
  };

  useEffect(() => {
    setCustomName(currentPlayer.name);
    setCustomSchool(currentPlayer.school_name || "");
  }, [currentPlayer.name, currentPlayer.school_name]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      } else if (event.type === "START_TIMER") {
        setTimerStartTime(Date.now());
        setSubmittedAnswer("");
        setSubmittedTime(null);
        setInputText("");
        setBuzzerPressed(false);
        setMatchState((prev) => ({
          ...prev,
          is_timer_running: true,
          time_left: event.time_limit,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
        }));
        setTimeout(() => inputRef.current?.focus(), 150);
      } else if (event.type === "LOCK_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            return res ? { ...p, score: p.score + res.points_awarded } : p;
          });
          return { ...prev, is_scored: true, players: updatedPlayers };
        });
      } else if (event.type === "RESET_BUZZER") {
        setBuzzerPressed(false);
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null }));
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
        setSubmittedAnswer("");
        setSubmittedTime(null);
        setInputText("");
        setBuzzerPressed(false);
        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_timer_running: false,
          is_locked: true,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
        }));
      }
    });

    return () => unsubscribe();
  }, [slotNumber]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const canInteract = matchState.is_timer_running && !matchState.is_locked;

  const handleSubmitAnswer = (answer: string) => {
    if (!canInteract || !answer.trim() || submittedAnswer) return;
    const timeMs = Math.max(50, Date.now() - timerStartTime);

    setSubmittedAnswer(answer.trim());
    setSubmittedTime(timeMs);

    sendGameEvent({
      type: "SUBMIT_ANSWER",
      slot_number: slotNumber,
      answer_text: answer.trim(),
      response_time_ms: timeMs,
    });
  };

  const handlePressBuzzer = () => {
    if (!canInteract || buzzerPressed || matchState.buzzer_winner_slot) return;
    const timeMs = Math.max(50, Date.now() - timerStartTime);
    setBuzzerPressed(true);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200);
    }

    sendGameEvent({
      type: "PRESS_BUZZER",
      slot_number: slotNumber,
      press_time_ms: timeMs,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slotNumber
        ? { ...p, name: customName.trim(), school_name: customSchool.trim() }
        : p
    );

    const updatedState = { ...matchState, players: updatedPlayers };
    setMatchState(updatedState);
    saveMatchStateLocally(updatedState);

    sendGameEvent({
      type: "UPDATE_PLAYER_INFO",
      slot_number: slotNumber,
      name: customName.trim(),
      school_name: customSchool.trim(),
    });
    sendGameEvent({ type: "SYNC_STATE", state: updatedState });
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-6 md:p-10 max-w-6xl mx-auto font-sans select-none relative">
      {/* Modal Chỉnh Sửa Tên Thí Sinh */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-blue-900 bg-[#0b1329] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/60">
              <h2 className="text-base font-black uppercase text-white">
                ĐỔI TÊN THÍ SINH VỊ TRÍ {slotNumber}
              </h2>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase">HỌ VÀ TÊN THÍ SINH:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#060a14] border border-blue-900 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase">TRƯỜNG / ĐƠN VỊ ĐẠI DIỆN:</label>
                <input
                  type="text"
                  value={customSchool}
                  onChange={(e) => setCustomSchool(e.target.value)}
                  className="w-full bg-[#060a14] border border-blue-900 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-11 rounded-xl uppercase">
                Lưu Thay Đổi & Cập Nhật Lên Màn Hình
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Header Máy Thí Sinh Rộng Rãi Cho Laptop */}
      <header className="bg-[#0b1329] border-2 border-blue-900/80 rounded-2xl p-5 flex flex-wrap items-center justify-between shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-900 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold" title="Về Trang Chủ">
            <Home className="w-4 h-4" />
            <span>Trang Chủ</span>
          </Link>
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-md">
            {slotNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xl text-white line-clamp-1">{currentPlayer.name}</h1>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="p-1.5 rounded-lg hover:bg-blue-900/40 text-slate-400 hover:text-white"
                title="Đổi tên của bạn"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">{currentPlayer.school_name || "Đại diện trường"}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">VÒNG THI HIỆN TẠI</span>
            <span className="text-sm font-black text-blue-300">{currentRound?.title} • Câu {matchState.current_question_index + 1}</span>
          </div>
          <div className="bg-[#060a14] border border-blue-900 px-5 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">ĐIỂM SỐ</span>
            <span className="font-mono text-3xl font-black text-amber-400">{currentPlayer.score}</span>
          </div>
        </div>
      </header>

      {/* Nội Dung Tương Tác Laptop Chính */}
      <main className="my-auto py-8 max-w-4xl mx-auto w-full">
        {!canInteract && !submittedAnswer ? (
          /* TRẠNG THÁI KHÓA MÁY CHỜ MC BẤM BẮT ĐẦU */
          <div className="bg-[#0b1329] border-2 border-blue-900/60 rounded-3xl p-12 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-950 border border-blue-900 mx-auto flex items-center justify-center text-blue-400">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-wide">
              {matchState.is_locked ? "ĐÃ HẾT GIỜ / ĐÃ KHÓA BÀI" : "ĐANG CHỜ MC BẮT ĐẦU CÂU HỎI..."}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto font-medium">
              {matchState.is_locked
                ? "Thời gian trả lời cho câu hỏi này đã kết thúc. Vui lòng quan sát màn hình chiếu."
                : "Hệ thống sẽ tự động mở khóa các nút bấm và ô nhập ngay khi MC bấm bắt đầu câu hỏi."}
            </p>
          </div>
        ) : currentQuestion?.question_type === "buzzer" ? (
          /* VÒNG BẤM CHUÔNG */
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <button
              onClick={handlePressBuzzer}
              disabled={!canInteract || !!matchState.buzzer_winner_slot}
              className={`w-72 h-72 rounded-full border-8 flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl ${
                matchState.buzzer_winner_slot === slotNumber
                  ? "bg-amber-500 border-amber-300 text-black scale-105"
                  : matchState.buzzer_winner_slot
                  ? "bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                  : "bg-red-600 border-red-400 text-white hover:bg-red-500 cursor-pointer shadow-red-600/40"
              }`}
            >
              <Zap className="w-20 h-20 mb-2 fill-current" />
              <span className="text-2xl font-black tracking-tight uppercase">
                {matchState.buzzer_winner_slot === slotNumber ? "ĐÃ GIÀNH QUYỀN!" : "BẤM CHUÔNG"}
              </span>
            </button>
          </div>
        ) : currentQuestion?.question_type === "multiple_choice" ? (
          /* VÒNG TRẮC NGHIỆM A / B / C / D RỘNG RÃI CHO LAPTOP */
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-center">
              CHỌN 1 TRONG 4 ĐÁP ÁN DƯỚI ĐÂY:
            </span>
            <div className="grid grid-cols-2 gap-4">
              {["A", "B", "C", "D"].map((choice) => {
                const isSelected = submittedAnswer.startsWith(choice);
                return (
                  <button
                    key={choice}
                    disabled={!canInteract || !!submittedAnswer}
                    onClick={() => handleSubmitAnswer(choice)}
                    className={`h-32 rounded-2xl font-black text-4xl flex flex-col items-center justify-center transition-all border-2 active:scale-98 ${
                      isSelected
                        ? "bg-blue-600 border-blue-400 text-white shadow-xl scale-102"
                        : "bg-[#0b1329] border-blue-900/80 text-white hover:border-blue-500 hover:bg-blue-950/40 disabled:opacity-50"
                    }`}
                  >
                    <span>{choice}</span>
                    {isSelected && <span className="text-xs font-bold opacity-90 uppercase mt-1">ĐÃ CHỌN</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* VÒNG NHẬP ĐÁP ÁN TỰ LUẬN / TĂNG TỐC */
          <div className="bg-[#0b1329] border-2 border-blue-900/80 rounded-3xl p-8 space-y-5 shadow-2xl">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wide block">
              NHẬP CÂU TRẢ LỜI CỦA BẠN:
            </label>
            <input
              ref={inputRef}
              type="text"
              disabled={!canInteract || !!submittedAnswer}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitAnswer(inputText);
              }}
              placeholder="Gõ câu trả lời tại đây rồi bấm Gửi hoặc phím Enter..."
              className="w-full h-16 rounded-2xl bg-[#060a14] border-2 border-blue-900 px-5 text-2xl font-black text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            <Button
              disabled={!canInteract || !inputText.trim() || !!submittedAnswer}
              onClick={() => handleSubmitAnswer(inputText)}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black text-base uppercase rounded-2xl gap-2 shadow-lg shadow-blue-600/30"
            >
              <Send className="w-5 h-5" /> Gửi Đáp Án Về Ban Giám Khảo
            </Button>
          </div>
        )}

        {/* Thông Báo Trạng Thái Sau Khi Đã Gửi Bài */}
        {submittedAnswer && (
          <div className="mt-6 bg-[#0b1329] border-2 border-emerald-500/80 rounded-2xl p-6 text-center space-y-1.5 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm uppercase">
              <CheckCircle2 className="w-5 h-5" />
              <span>ĐÃ GỬI ĐÁP ÁN THÀNH CÔNG VỀ MÁY CHỦ</span>
            </div>
            <div className="text-3xl font-black text-white uppercase tracking-wide">{submittedAnswer}</div>
            {submittedTime && (
              <div className="text-xs font-mono text-slate-400 font-bold">
                Thời gian ghi nhận nộp bài: {(submittedTime / 1000).toFixed(2)} giây
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t-2 border-blue-900/60 pt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>MÁY THI ĐẤU VỊ TRÍ SỐ {slotNumber}</span>
        <span>NHẤN VÀO TÊN ĐỂ THAY ĐỔI THÔNG TIN</span>
      </footer>
    </div>
  );
}