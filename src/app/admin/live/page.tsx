"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
  syncMatchStateToCloud,
} from "@/lib/supabase";
import { sound } from "@/lib/sounds";
import { checkAnswerCorrectness } from "@/lib/grading";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Tv,
  Clock,
  Volume2,
  VolumeX,
  Star,
  Zap,
  Lock,
  Eye,
  Sliders,
  ShieldCheck,
  Sparkles,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>("15");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];
  const isVeDichRound = currentRound?.round_type === "ve_dich";

  // Cập nhật thời gian mặc định khi chuyển câu hỏi
  useEffect(() => {
    if (currentQuestion?.time_limit) {
      setCustomTimeInput(String(currentQuestion.time_limit));
      setTimeLeft(currentQuestion.time_limit);
      setIsTimerActive(false);
    }
  }, [matchState.current_round_index, matchState.current_question_index, currentQuestion?.time_limit]);

  // MASTER TIMER INTERVAL
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            sound.playTimeUp();
            setIsTimerActive(false);
            handleLockAnswers();
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

  // TÍCH HỢP PRO HOTKEYS CHO MC / BAN GIÁM KHẢO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isTimerActive) {
          handlePauseTimer();
        } else {
          handleStartTimer();
        }
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        handleLockAnswers();
      } else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        executeAutoGrade();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleResetTimer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTimerActive, timeLeft, matchState]);

  const toggleMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    sound.setMuted(next);
  };

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SUBMIT_ANSWER") {
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
      } else if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
        setTimeLeft(event.state.time_left);
        setIsTimerActive(event.state.is_timer_running);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleStartTimer = (seconds?: number) => {
    const duration = seconds || Number(customTimeInput) || currentQuestion?.time_limit || 15;
    setTimeLeft(duration);
    setIsTimerActive(true);
    sound.playTick();

    const newState: MatchState = {
      ...matchState,
      is_standby: false,
      is_timer_running: true,
      time_left: duration,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      current_responses: {},
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "START_TIMER", time_limit: duration, start_time: Date.now() });
  };

  const handlePauseTimer = () => {
    setIsTimerActive(false);
    const newState: MatchState = { ...matchState, is_timer_running: false, time_left: timeLeft };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleResetTimer = () => {
    setIsTimerActive(false);
    const defaultTime = currentQuestion?.time_limit || 15;
    setTimeLeft(defaultTime);
    const newState: MatchState = {
      ...matchState,
      is_timer_running: false,
      time_left: defaultTime,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      current_responses: {},
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleLockAnswers = () => {
    setIsTimerActive(false);
    const newState: MatchState = {
      ...matchState,
      is_locked: true,
      is_timer_running: false,
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "LOCK_ANSWERS" });
  };

  const handleRevealAnswers = () => {
    const newState: MatchState = {
      ...matchState,
      is_revealed: true,
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "REVEAL_ANSWERS" });
  };

  const handleToggleStandby = () => {
    const next = !matchState.is_standby;
    const newState: MatchState = { ...matchState, is_standby: next };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "TOGGLE_STANDBY", is_standby: next });
  };

  const handleResetBuzzer = () => {
    const newState: MatchState = {
      ...matchState,
      buzzer_winner_slot: null,
      buzzer_winner_time_ms: null,
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "RESET_BUZZER" });
  };

  const handleToggleStar = (slot: number) => {
    const nextSlot = matchState.star_of_hope_slot === slot ? null : slot;
    const newState: MatchState = { ...matchState, star_of_hope_slot: nextSlot };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "TOGGLE_STAR_OF_HOPE", slot_number: nextSlot });
  };

  const handleSetActivePlayer = (slot: number | null) => {
    const newState: MatchState = { ...matchState, active_player_slot: slot };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SET_ACTIVE_PLAYER", slot_number: slot });
  };

  const handleOverrideScore = (slot: 1 | 2 | 3 | 4, delta: number) => {
    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slot ? { ...p, score: Math.max(0, p.score + delta) } : p
    );
    const newState: MatchState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "OVERRIDE_SCORE", slot_number: slot, delta });
  };

  const handleSelectQuestion = (qIndex: number) => {
    setIsTimerActive(false);
    const targetQ = currentRound.questions[qIndex];
    const newTime = targetQ?.time_limit || 15;
    setTimeLeft(newTime);
    setCustomTimeInput(String(newTime));

    const newState: MatchState = {
      ...matchState,
      current_question_index: qIndex,
      is_timer_running: false,
      time_left: newTime,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      current_responses: {},
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({
      type: "CHANGE_QUESTION",
      round_index: matchState.current_round_index,
      question_index: qIndex,
    });
  };

  const handleSelectRound = (rIndex: number) => {
    setIsTimerActive(false);
    const targetRound = matchState.rounds[rIndex];
    const targetQ = targetRound?.questions[0];
    const newTime = targetQ?.time_limit || 15;
    setTimeLeft(newTime);
    setCustomTimeInput(String(newTime));

    const newState: MatchState = {
      ...matchState,
      current_round_index: rIndex,
      current_question_index: 0,
      is_timer_running: false,
      time_left: newTime,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      star_of_hope_slot: null,
      active_player_slot: null,
      current_responses: {},
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({
      type: "CHANGE_QUESTION",
      round_index: rIndex,
      question_index: 0,
    });
  };

  // TỰ ĐỘNG CHẤM ĐIỂM THÔNG MINH (CASE-INSENSITIVE & VIETNAMESE-AWARE)
  const executeAutoGrade = () => {
    if (!currentQuestion) return;
    const isTangToc = currentRound.round_type === "tang_toc";
    const correctAnswer = currentQuestion.correct_answer;

    const submissions = Object.values(matchState.current_responses);
    const correctSubmissions = submissions
      .filter((sub) => checkAnswerCorrectness(sub.answer_text, correctAnswer))
      .sort((a, b) => a.response_time_ms - b.response_time_ms);

    const results: Record<number, { is_correct: boolean; points_awarded: number }> = {};
    const tangTocPoints = [40, 30, 20, 10];

    matchState.players.forEach((p) => {
      const resp = matchState.current_responses[p.slot_number];
      const hasStar = isVeDichRound && matchState.star_of_hope_slot === p.slot_number;

      if (!resp) {
        const penalty = hasStar ? Math.floor(currentQuestion.points_correct / 2) : 0;
        results[p.slot_number] = { is_correct: false, points_awarded: -penalty };
        return;
      }

      const rankIndex = correctSubmissions.findIndex((c) => c.slot_number === p.slot_number);
      const isCorrect = rankIndex !== -1;
      let points = 0;

      if (isCorrect) {
        if (isTangToc) {
          points = tangTocPoints[rankIndex] || 10;
        } else {
          points = hasStar ? currentQuestion.points_correct * 2 : currentQuestion.points_correct;
        }
      } else {
        points = hasStar ? -Math.floor(currentQuestion.points_correct / 2) : 0;
      }

      results[p.slot_number] = { is_correct: isCorrect, points_awarded: points };
    });

    const updatedPlayers = matchState.players.map((p) => {
      const res = results[p.slot_number];
      return res ? { ...p, score: Math.max(0, p.score + res.points_awarded) } : p;
    });

    const updatedResponses = { ...matchState.current_responses };
    Object.entries(results).forEach(([slot, res]) => {
      const num = Number(slot);
      if (updatedResponses[num]) {
        updatedResponses[num].is_correct = res.is_correct;
        updatedResponses[num].points_awarded = res.points_awarded;
      }
    });

    const newState: MatchState = {
      ...matchState,
      players: updatedPlayers,
      current_responses: updatedResponses,
      is_scored: true,
      is_revealed: true,
    };

    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "GRADE_ANSWERS", results });
  };

  return (
    <div className="min-h-screen bg-[#060c1a] text-slate-100 flex flex-col font-sans select-none pb-8">
      {/* TOP HEADER */}
      <header className="px-6 py-3 border-b border-slate-800 bg-[#070e1e] flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" showWordmark={false} />
          <div>
            <h1 className="text-xs md:text-sm font-black uppercase text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#e0c588]" /> BÀN ĐIỀU HÀNH BAN GIÁM KHẢO (LIVE CONTROL)
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Vòng: <span className="text-[#e0c588] font-bold">{currentRound.title}</span> | Câu: <span className="text-white font-bold">#{matchState.current_question_index + 1}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 bg-[#091326] px-3 py-1.5 rounded-xl border border-slate-800">
            <Command className="w-3 h-3 text-[#e0c588]" />
            <span>Phím tắt: <kbd className="px-1 bg-black/40 rounded font-mono">Space</kbd> Đếm giờ • <kbd className="px-1 bg-black/40 rounded font-mono">L</kbd> Khóa • <kbd className="px-1 bg-black/40 rounded font-mono">G</kbd> Chấm</span>
          </div>

          <Button
            onClick={handleToggleStandby}
            className={`text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer transition-all ${
              matchState.is_standby
                ? "bg-[#e0c588] hover:bg-[#c5a059] text-black shadow-lg shadow-[#e0c588]/20"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {matchState.is_standby ? "ĐANG STANDBY" : "BẬT STANDBY"}
          </Button>

          <Link href="/display" target="_blank">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white text-xs h-9 px-3 rounded-xl cursor-pointer">
              <Tv className="w-3.5 h-3.5 mr-1" /> Màn Máy Chiếu
            </Button>
          </Link>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-[#091326] border border-slate-800 text-slate-400 hover:text-white"
            title="Bật/Tắt âm thanh"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#e0c588]" />}
          </button>
        </div>
      </header>

      {/* 3-COLUMN WORKSPACE */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl mx-auto w-full">
        {/* CỘT 1: VÒNG THI & MASTER TIMER (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          {/* BỘ ĐẾM GIỜ MASTER TIMER PRO */}
          <div className="bg-[#091326] border-2 border-[#e0c588]/40 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#e0c588] uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> MASTER TIMER:
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${isTimerActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse" : "bg-slate-800 text-slate-400"}`}>
                {isTimerActive ? "ĐANG CHẠY" : "DỪNG"}
              </span>
            </div>

            {/* ĐỒNG HỒ ĐẾM NGƯỢC LED SỐ TO */}
            <div className="bg-[#060c1a] border border-slate-800 rounded-xl py-3 text-center">
              <span className={`font-mono text-4xl md:text-5xl font-black tabular-nums transition-colors ${timeLeft <= 3 && isTimerActive ? "text-rose-500 animate-pulse" : "text-[#e0c588]"}`}>
                {String(timeLeft).padStart(2, "0")}<span className="text-sm font-bold text-slate-500">s</span>
              </span>
            </div>

            {/* CÁC NÚT ĐIỀU KHIỂN TIMER */}
            <div className="grid grid-cols-2 gap-2">
              {isTimerActive ? (
                <Button
                  onClick={handlePauseTimer}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-md"
                >
                  <Pause className="w-3.5 h-3.5 mr-1" /> Tạm Dừng (Space)
                </Button>
              ) : (
                <Button
                  onClick={() => handleStartTimer()}
                  className="bg-[#c5a059] hover:bg-[#b48f48] text-black font-black text-xs h-9 rounded-xl cursor-pointer shadow-lg shadow-[#c5a059]/20"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Bắt Đầu (Space)
                </Button>
              )}

              <Button
                onClick={handleResetTimer}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs h-9 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset (R)
              </Button>
            </div>

            {/* CÁC MỐC THỜI GIAN NHANH */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[15, 20, 30].map((sec) => (
                <Button
                  key={sec}
                  onClick={() => handleStartTimer(sec)}
                  className="bg-[#060c1a] hover:bg-[#0d1c3a] border border-slate-800 text-slate-300 hover:text-white font-mono font-bold text-xs h-8 rounded-lg cursor-pointer"
                >
                  {sec}s
                </Button>
              ))}
            </div>
          </div>

          {/* 4 VÒNG THI */}
          <div className="bg-[#091326] border border-slate-800/80 rounded-2xl p-4 space-y-2 shadow-md">
            <span className="text-xs font-bold text-slate-400 uppercase block">4 VÒNG THI ĐẤU:</span>
            <div className="space-y-1.5">
              {matchState.rounds.map((round, idx) => (
                <button
                  key={round.id}
                  onClick={() => handleSelectRound(idx)}
                  className={`w-full text-left p-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer flex items-center justify-between ${
                    matchState.current_round_index === idx
                      ? "bg-[#c5a059] border-[#e0c588] text-black shadow-md font-black"
                      : "bg-[#060c1a] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{idx + 1}. {round.title}</span>
                  <span className="text-[10px] font-mono opacity-80">{round.questions.length} câu</span>
                </button>
              ))}
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI */}
          <div className="bg-[#091326] border border-slate-800/80 rounded-2xl p-4 space-y-2 shadow-md">
            <span className="text-xs font-bold text-slate-400 uppercase block">CÂU HỎI TRONG VÒNG:</span>
            <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {currentRound.questions.map((_, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => handleSelectQuestion(qIdx)}
                  className={`h-8 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                    matchState.current_question_index === qIdx
                      ? "bg-[#e0c588] border-[#f4e5be] text-black shadow-md scale-105 font-black"
                      : "bg-[#060c1a] border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  #{qIdx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT 2: CHI TIẾT CÂU HỎI & NÚT ĐIỀU PHỐI (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#091326] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <span className="text-xs font-bold text-[#e0c588] uppercase">
                CÂU {matchState.current_question_index + 1} (+{currentQuestion?.points_correct}đ)
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">{currentQuestion?.question_type}</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-base md:text-lg font-bold text-white leading-relaxed">
                {currentQuestion?.question_text || "Chưa có câu hỏi"}
              </h2>

              {/* PHƯƠNG ÁN TRẮC NGHIỆM */}
              {currentQuestion?.options && currentQuestion.options.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {currentQuestion.options.map((opt, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[#060c1a] border border-slate-800 text-xs text-slate-300">
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#060c1a] border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">ĐÁP ÁN CHÍNH XÁC:</span>
                <p className="font-mono text-base font-black text-emerald-400 uppercase">
                  {currentQuestion?.correct_answer}
                </p>
              </div>
            </div>

            {/* BỘ NÚT ĐIỀU PHỐI */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
              <Button
                onClick={handleLockAnswers}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-9 rounded-xl cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> Khóa Nộp (L)
              </Button>
              <Button
                onClick={handleRevealAnswers}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-md"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> Mở Đáp Án
              </Button>
              <Button
                onClick={executeAutoGrade}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-9 rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Chấm Điểm (G)
              </Button>
            </div>
          </div>

          {/* VÒNG 4: THI ĐẤU & SAO */}
          {isVeDichRound && (
            <div className="bg-[#091326] border border-[#e0c588]/30 rounded-2xl p-4 space-y-2.5 shadow-xl">
              <span className="text-xs font-bold text-[#e0c588] uppercase flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-[#e0c588]" /> VÒNG 4: LƯỢT THI CHÍNH & NGÔI SAO HY VỌNG
              </span>

              <div className="grid grid-cols-4 gap-2">
                {matchState.players.map((p) => {
                  const isMain = matchState.active_player_slot === p.slot_number;
                  const isStar = matchState.star_of_hope_slot === p.slot_number;

                  return (
                    <div key={p.slot_number} className="space-y-1">
                      <button
                        onClick={() => handleSetActivePlayer(isMain ? null : p.slot_number)}
                        className={`w-full py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                          isMain ? "bg-[#c5a059] text-black border-[#e0c588] shadow-md" : "bg-[#060c1a] text-slate-400 border-slate-800"
                        }`}
                      >
                        MÁY {p.slot_number}
                      </button>
                      <button
                        onClick={() => handleToggleStar(p.slot_number)}
                        className={`w-full py-1 rounded-md text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isStar ? "bg-[#e0c588] text-black border-[#f4e5be]" : "bg-transparent text-slate-500 border-slate-800"
                        }`}
                      >
                        <Star className={`w-3 h-3 ${isStar ? "fill-black" : ""}`} /> SAO
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHUÔNG CƯỚP ĐIỂM */}
          {matchState.buzzer_winner_slot && (
            <div className="bg-rose-950/40 border border-rose-500/60 rounded-2xl p-3.5 flex items-center justify-between shadow-xl animate-pulse">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-rose-400 fill-rose-400" />
                <div>
                  <span className="text-[10px] font-bold text-rose-300 uppercase block">CƯỚP ĐIỂM THÀNH CÔNG:</span>
                  <span className="text-xs font-black text-white uppercase">
                    {matchState.players.find((p) => p.slot_number === matchState.buzzer_winner_slot)?.name} (MÁY {matchState.buzzer_winner_slot})
                  </span>
                </div>
              </div>
              <Button size="sm" onClick={handleResetBuzzer} className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-7 px-2.5 rounded-lg">
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* CỘT 3: 4 THÍ SINH & CHẤM ĐIỂM THỦ CÔNG (4/12) */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase block">GIÁM SÁT 4 THÍ SINH:</span>

          <div className="space-y-2.5">
            {matchState.players.map((p) => {
              const resp = matchState.current_responses[p.slot_number];
              const isStar = matchState.star_of_hope_slot === p.slot_number;

              return (
                <div key={p.slot_number} className="bg-[#091326] border border-slate-800/80 rounded-2xl p-3 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        MÁY {p.slot_number}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[130px]">
                        {p.name || `Thí sinh ${p.slot_number}`}
                      </span>
                    </div>

                    <span className="font-mono text-base font-black text-[#e0c588] tabular-nums">
                      {p.score}đ
                    </span>
                  </div>

                  <div className="p-1.5 rounded-lg bg-[#060c1a] border border-slate-800 flex items-center justify-between min-h-[28px]">
                    <span className="text-[11px] font-mono text-slate-300 truncate">
                      {resp ? resp.answer_text : <span className="text-slate-600 italic">Chưa nộp</span>}
                    </span>
                    {resp && (
                      <span className="text-[10px] text-[#e0c588] font-mono">
                        {(resp.response_time_ms / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleOverrideScore(p.slot_number, isStar ? 40 : 20)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-6 px-1 rounded-md cursor-pointer"
                    >
                      +{isStar ? "40" : "20"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOverrideScore(p.slot_number, isStar ? 60 : 30)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] h-6 px-1 rounded-md cursor-pointer"
                    >
                      +{isStar ? "60" : "30"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOverrideScore(p.slot_number, isStar ? -10 : -10)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] h-6 px-1 rounded-md cursor-pointer"
                    >
                      -{isStar ? "10" : "10"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
