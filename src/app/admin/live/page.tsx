"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sounds";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Play,
  Pause,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Minus,
  Bell,
  Sliders,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);

  // Sync state to local storage whenever it changes
  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

  // Subscribe realtime
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
        setMatchState((prev) => {
          if (!prev.buzzer_winner_slot) {
            return {
              ...prev,
              buzzer_winner_slot: event.slot_number,
              buzzer_winner_time_ms: event.press_time_ms,
            };
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  // Actions
  const handleStartTimer = () => {
    const timeLimit = currentQuestion?.time_limit || 15;
    const newState = {
      ...matchState,
      is_timer_running: true,
      time_left: timeLimit,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      buzzer_winner_time_ms: null,
      current_responses: {},
    };
    setMatchState(newState);
    sendGameEvent({ type: "START_TIMER", time_limit: timeLimit, start_time: Date.now() });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handlePauseTimer = () => {
    setMatchState((prev) => ({ ...prev, is_timer_running: false }));
    sendGameEvent({ type: "PAUSE_TIMER" });
  };

  const handleLockAnswers = () => {
    const newState = { ...matchState, is_locked: true, is_timer_running: false };
    setMatchState(newState);
    sendGameEvent({ type: "LOCK_ANSWERS" });
  };

  const handleRevealAnswers = () => {
    const newState = { ...matchState, is_revealed: true };
    setMatchState(newState);
    sendGameEvent({ type: "REVEAL_ANSWERS" });
  };

  const handleAutoGrade = () => {
    if (!currentQuestion) return;
    const isTangToc = currentRound.round_type === "tang_toc";
    const correctAnswers = currentQuestion.correct_answer.toLowerCase().trim();

    // Sắp xếp các thí sinh nộp đúng theo thời gian
    const submissions = Object.values(matchState.current_responses);
    const correctSubmissions = submissions
      .filter((sub) => {
        const text = sub.answer_text.toLowerCase().trim();
        return text.includes(correctAnswers) || correctAnswers.includes(text) || (currentQuestion.options && sub.answer_text.startsWith(currentQuestion.correct_answer[0]));
      })
      .sort((a, b) => a.response_time_ms - b.response_time_ms);

    const results: Record<number, { is_correct: boolean; points_awarded: number }> = {};
    const tangTocPoints = [40, 30, 20, 10];

    matchState.players.forEach((p) => {
      const resp = matchState.current_responses[p.slot_number];
      if (!resp) {
        results[p.slot_number] = { is_correct: false, points_awarded: 0 };
        return;
      }

      const rankIndex = correctSubmissions.findIndex((c) => c.slot_number === p.slot_number);
      const isCorrect = rankIndex !== -1;
      let points = 0;

      if (isCorrect) {
        if (isTangToc) {
          points = tangTocPoints[rankIndex] || 10;
        } else {
          points = currentQuestion.points_correct;
        }
      } else {
        points = -currentQuestion.points_wrong;
      }

      results[p.slot_number] = { is_correct: isCorrect, points_awarded: points };
    });

    const updatedPlayers = matchState.players.map((p) => ({
      ...p,
      score: p.score + (results[p.slot_number]?.points_awarded || 0),
    }));

    const updatedResponses = { ...matchState.current_responses };
    Object.keys(results).forEach((k) => {
      const slot = Number(k);
      if (updatedResponses[slot]) {
        updatedResponses[slot].is_correct = results[slot].is_correct;
        updatedResponses[slot].points_awarded = results[slot].points_awarded;
      }
    });

    const newState = {
      ...matchState,
      is_scored: true,
      players: updatedPlayers,
      current_responses: updatedResponses,
    };

    setMatchState(newState);
    sendGameEvent({ type: "GRADE_ANSWERS", results });
  };

  const handleManualGrade = (slot: number, isCorrect: boolean) => {
    const points = isCorrect ? currentQuestion.points_correct : -currentQuestion.points_wrong;
    const results = {
      [slot]: { is_correct: isCorrect, points_awarded: points },
    };

    const updatedPlayers = matchState.players.map((p) =>
      p.slot_number === slot ? { ...p, score: p.score + points } : p
    );

    const updatedResponses = {
      ...matchState.current_responses,
      [slot]: {
        ...(matchState.current_responses[slot] || { slot_number: slot, answer_text: "", response_time_ms: 0 }),
        is_correct: isCorrect,
        points_awarded: points,
      },
    };

    const newState = {
      ...matchState,
      is_scored: true,
      players: updatedPlayers,
      current_responses: updatedResponses,
    };

    setMatchState(newState);
    sendGameEvent({ type: "GRADE_ANSWERS", results });
  };

  const handleScoreOverride = (slot: number, delta: number) => {
    const newState = {
      ...matchState,
      players: matchState.players.map((p) =>
        p.slot_number === slot ? { ...p, score: p.score + delta } : p
      ),
    };
    setMatchState(newState);
    sendGameEvent({ type: "OVERRIDE_SCORE", slot_number: slot as 1 | 2 | 3 | 4, delta });
  };

  const handleResetBuzzer = () => {
    const newState = { ...matchState, buzzer_winner_slot: null, buzzer_winner_time_ms: null };
    setMatchState(newState);
    sendGameEvent({ type: "RESET_BUZZER" });
  };

  const handleChangeQuestion = (roundIdx: number, questionIdx: number) => {
    const newState = {
      ...matchState,
      current_round_index: roundIdx,
      current_question_index: questionIdx,
      is_locked: false,
      is_revealed: false,
      is_scored: false,
      buzzer_winner_slot: null,
      buzzer_winner_time_ms: null,
      current_responses: {},
    };
    setMatchState(newState);
    sendGameEvent({ type: "CHANGE_QUESTION", round_index: roundIdx, question_index: questionIdx });
  };

  const handleTriggerSFX = (sfx: "correct" | "wrong" | "buzzer" | "victory") => {
    sound.playCorrect();
    sendGameEvent({ type: "PLAY_SFX", sfx });
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 p-4 md:p-6 font-sans">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between border-b border-blue-900/50 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              BẢNG ĐIỀU KHIỂN MC / GIÁM KHẢO
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE REALTIME
              </span>
            </h1>
            <p className="text-xs text-slate-400">Trận đấu: {matchState.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/display"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-2 hover:bg-amber-500/30"
          >
            Mở Màn Hình Máy Chiếu
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-700"
          >
            Ngân Hàng Câu Hỏi
          </Link>
        </div>
      </header>

      {/* TOP CONTROLS: Round & Question Navigation */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 border border-blue-500/20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase text-blue-400">Chọn Vòng:</span>
          <select
            value={matchState.current_round_index}
            onChange={(e) => handleChangeQuestion(Number(e.target.value), 0)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
          >
            {matchState.rounds.map((r, idx) => (
              <option key={r.id} value={idx}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={matchState.current_question_index === 0}
            onClick={() =>
              handleChangeQuestion(matchState.current_round_index, matchState.current_question_index - 1)
            }
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-200 px-3">
            Câu {matchState.current_question_index + 1} / {currentRound?.questions.length || 1}
          </span>
          <button
            disabled={matchState.current_question_index >= (currentRound?.questions.length || 1) - 1}
            onClick={() =>
              handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1)
            }
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: Start Timer, Lock, Reveal, Grade */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartTimer}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:brightness-110"
          >
            <Play className="w-4 h-4 fill-white" />
            Bắt Đầu Đếm Ngược ({currentQuestion?.time_limit || 15}s)
          </button>
          <button
            onClick={handlePauseTimer}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm font-semibold flex items-center gap-1.5"
          >
            <Pause className="w-4 h-4" /> Tạm dừng
          </button>
          <button
            onClick={handleLockAnswers}
            className="px-4 py-2 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-300 hover:bg-rose-600/40 text-sm font-bold flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Khóa Máy
          </button>
          <button
            onClick={handleRevealAnswers}
            className="px-4 py-2 rounded-xl bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:bg-amber-500/40 text-sm font-bold flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Mở Đáp Án
          </button>
          <button
            onClick={handleAutoGrade}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" /> Chấm Tự Động
          </button>
        </div>
      </div>

      {/* CURRENT QUESTION CARD & MC ANSWER KEY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold">
              LOẠI: {currentQuestion?.question_type.toUpperCase()} • {currentQuestion?.time_limit}S
            </span>
            <span className="text-xs font-mono text-slate-400">
              Đúng: +{currentQuestion?.points_correct}đ | Sai: -{currentQuestion?.points_wrong}đ
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">{currentQuestion?.question_text}</h2>

          {/* Đáp Án Chuẩn (Dành riêng cho MC đọc trước) */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
              Đáp Án Chuẩn Của Ban Giám Khảo:
            </div>
            <div className="text-lg font-black text-white">{currentQuestion?.correct_answer}</div>
            {currentQuestion?.explanation && (
              <p className="text-xs text-slate-300 mt-2 italic">{currentQuestion.explanation}</p>
            )}
          </div>
        </div>

        {/* BUZZER STATUS & QUICK SFX */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Trạng Thái Chuông
            </h3>
            {matchState.buzzer_winner_slot ? (
              <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-center animate-pulse">
                <span className="text-2xl font-black text-amber-300 block">
                  THÍ SINH {matchState.buzzer_winner_slot}
                </span>
                <span className="text-xs text-slate-300">
                  Đã bấm lúc {(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s
                </span>
                <button
                  onClick={handleResetBuzzer}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 mx-auto block"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset Chuông
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm italic">
                Chưa có ai bấm chuông
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-400 block mb-2">Hiệu ứng kịch tính:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTriggerSFX("victory")}
                className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-amber-500/30"
              >
                <Sparkles className="w-3.5 h-3.5" /> Pháo hoa
              </button>
              <button
                onClick={() => handleTriggerSFX("wrong")}
                className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-red-500/30"
              >
                <XCircle className="w-3.5 h-3.5" /> Tiếng Xịt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 CONTESTANTS LIVE TELEMETRY & MANUAL GRADING */}
      <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
        Giám Sát 4 Máy Thí Sinh & Chấm Điểm
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {matchState.players.map((player) => {
          const resp = matchState.current_responses[player.slot_number];
          return (
            <div
              key={player.slot_number}
              className={`glass-panel rounded-2xl p-5 border transition-all ${
                resp?.is_correct === true
                  ? "border-emerald-500/80 bg-emerald-950/20"
                  : resp?.is_correct === false
                  ? "border-red-500/80 bg-red-950/20"
                  : "border-slate-700/60"
              }`}
            >
              {/* Header Thí Sinh */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-sm font-black text-blue-300">
                    {player.slot_number}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 line-clamp-1">{player.name}</h4>
                    <span className="text-[11px] text-slate-400">{player.school_name}</span>
                  </div>
                </div>
                <span className="font-mono font-black text-lg text-amber-400">{player.score}đ</span>
              </div>

              {/* Câu Trả Lời Của Thí Sinh (Live Telemetry) */}
              <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800 mb-4 min-h-[70px] flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                  Đáp Án Thí Sinh Gửi:
                </span>
                {resp ? (
                  <div className="flex items-center justify-between">
                    <span className="font-black text-base text-white uppercase">{resp.answer_text}</span>
                    <span className="text-xs font-mono text-slate-400">
                      {(resp.response_time_ms / 1000).toFixed(2)}s
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 italic">Chưa có dữ liệu</span>
                )}
              </div>

              {/* Nút Chấm Đúng / Sai Thủ Công */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => handleManualGrade(player.slot_number, true)}
                  className="py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/50 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đúng (+{currentQuestion?.points_correct}đ)
                </button>
                <button
                  onClick={() => handleManualGrade(player.slot_number, false)}
                  className="py-1.5 rounded-lg bg-red-600/30 border border-red-500/50 hover:bg-red-600/50 text-red-300 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Sai (-{currentQuestion?.points_wrong}đ)
                </button>
              </div>

              {/* Cộng / Trừ Điểm Tay */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Chỉnh điểm:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleScoreOverride(player.slot_number, 10)}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => handleScoreOverride(player.slot_number, -10)}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold"
                  >
                    -10
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
