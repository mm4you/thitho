"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Zap, Send, Lock, Edit2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    name: `Thi sinh ${slotNumber}`,
    score: 0,
    school_name: "Thi sinh",
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

  // Chi duoc phep thao tac khi MC da bam Bat Dau va chua bi Khoa
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
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-4 max-w-md mx-auto font-sans select-none relative">
      {/* Modal Doi Ten */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-2 border-blue-900 bg-[#0b1329] shadow-2xl">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase text-white">
                DOI TEN THI SINH {slotNumber}
              </CardTitle>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">HO VA TEN:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#060a14] border border-blue-900 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">TRUONG / DON VI:</label>
                  <input
                    type="text"
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value)}
                    className="w-full bg-[#060a14] border border-blue-900 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 rounded-lg">
                  Luu Thay Doi
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header Info Thí Sinh */}
      <div className="bg-[#0b1329] border-2 border-blue-900/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl text-white">
            {slotNumber}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-white line-clamp-1">{currentPlayer.name}</h1>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="p-1 text-slate-400 hover:text-white"
                title="Doi ten"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">{currentPlayer.school_name || "Thi sinh"}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">DIEM</span>
          <span className="font-mono text-2xl font-black text-amber-400">{currentPlayer.score}</span>
        </div>
      </div>

      <div className="my-2 flex items-center justify-between text-xs font-bold text-slate-400 px-1">
        <span>{currentRound?.title}</span>
        <span>Cau {matchState.current_question_index + 1}</span>
      </div>

      {/* Khu Vực Tương Tác Chính */}
      <main className="flex-1 flex flex-col justify-center my-2 gap-4">
        {!canInteract && !submittedAnswer ? (
          /* TRẠNG THÁI KHÓA: ĐANG CHỜ MC BẤM BẮT ĐẦU */
          <div className="bg-[#0b1329] border-2 border-blue-950 rounded-3xl p-8 text-center space-y-3 my-auto shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-950/60 border border-blue-900 mx-auto flex items-center justify-center text-blue-400">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black uppercase text-white tracking-wide">
              {matchState.is_locked ? "DA HET GIO / DA KHOA BAI" : "DANG CHO MC BAT DAU..."}
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              {matchState.is_locked
                ? "Thoi gian tra loi cau hoi nay da ket thuc."
                : "He thong se tu dong mo khoa ngay khi MC bam bat dau cau hoi."}
            </p>
          </div>
        ) : currentQuestion?.question_type === "buzzer" ? (
          /* VÒNG BẤM CHUÔNG */
          <div className="flex flex-col items-center justify-center gap-4 my-auto">
            <button
              onClick={handlePressBuzzer}
              disabled={!canInteract || !!matchState.buzzer_winner_slot}
              className={`w-56 h-56 rounded-full border-4 flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl ${
                matchState.buzzer_winner_slot === slotNumber
                  ? "bg-amber-500 border-amber-300 text-black scale-105"
                  : matchState.buzzer_winner_slot
                  ? "bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                  : "bg-red-600 border-red-400 text-white hover:bg-red-500"
              }`}
            >
              <Zap className="w-16 h-16 mb-2 fill-current" />
              <span className="text-xl font-black tracking-tight uppercase">
                {matchState.buzzer_winner_slot === slotNumber ? "DA GIANG QUYEN!" : "BAM CHUONG"}
              </span>
            </button>
          </div>
        ) : currentQuestion?.question_type === "multiple_choice" ? (
          /* VÒNG TRẮC NGHIỆM A / B / C / D */
          <div className="grid grid-cols-2 gap-3 my-auto">
            {["A", "B", "C", "D"].map((choice) => {
              const isSelected = submittedAnswer.startsWith(choice);
              return (
                <button
                  key={choice}
                  disabled={!canInteract || !!submittedAnswer}
                  onClick={() => handleSubmitAnswer(choice)}
                  className={`h-24 rounded-2xl font-black text-3xl flex flex-col items-center justify-center transition-all border-2 active:scale-98 ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                      : "bg-[#0b1329] border-blue-900/80 text-white hover:border-blue-500 disabled:opacity-50"
                  }`}
                >
                  <span>{choice}</span>
                  {isSelected && <span className="text-[10px] font-bold opacity-90 uppercase">DA CHON</span>}
                </button>
              );
            })}
          </div>
        ) : (
          /* VÒNG NHẬP ĐÁP ÁN TỰ LUẬN / TĂNG TỐC */
          <div className="flex flex-col gap-3 my-auto">
            <label className="text-xs font-bold text-slate-300 uppercase">
              NHAP DAP AN CUA BAN:
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
              placeholder="Go dap an tai day..."
              className="w-full h-14 rounded-2xl bg-[#0b1329] border-2 border-blue-900 px-4 text-xl font-black text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            <Button
              disabled={!canInteract || !inputText.trim() || !!submittedAnswer}
              onClick={() => handleSubmitAnswer(inputText)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase rounded-xl gap-2"
            >
              <Send className="w-4 h-4" /> Gui Dap An
            </Button>
          </div>
        )}

        {/* Thẻ Trạng Thái Sau Khi Đã Nộp */}
        {submittedAnswer && (
          <div className="bg-[#0b1329] border-2 border-emerald-500/80 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              DA GUI DAP AN VE MAY CHU
            </span>
            <div className="text-xl font-black text-white uppercase">{submittedAnswer}</div>
            {submittedTime && (
              <div className="text-xs font-mono text-slate-400 font-bold">
                Thoi gian ghi nhan: {(submittedTime / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-[11px] font-medium text-slate-500 py-2">
        May Thi Dau {slotNumber} • Nhan vao ten de sua thong tin
      </footer>
    </div>
  );
}
