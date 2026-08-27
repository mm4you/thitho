"use client";

import { useEffect, useState } from "react";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Play,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);

  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

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
      } else if (event.type === "UPDATE_PLAYER_INFO") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number
              ? { ...p, name: event.name, school_name: event.school_name }
              : p
          ),
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const handleToggleStandby = () => {
    const newStandby = !matchState.is_standby;
    const newState = { ...matchState, is_standby: newStandby };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "TOGGLE_STANDBY", is_standby: newStandby });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleStartTimer = () => {
    const timeLimit = currentQuestion?.time_limit || 15;
    const newState: MatchState = {
      ...matchState,
      is_standby: false,
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

    const submissions = Object.values(matchState.current_responses);
    const correctSubmissions = submissions
      .filter((sub) => {
        const text = sub.answer_text.toLowerCase().trim();
        return (
          text.includes(correctAnswers) ||
          correctAnswers.includes(text) ||
          (currentQuestion.options && sub.answer_text.startsWith(currentQuestion.correct_answer[0]))
        );
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
        ...(matchState.current_responses[slot] || {
          slot_number: slot,
          answer_text: "",
          response_time_ms: 0,
        }),
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

  const handleNextQuestion = () => {
    if (matchState.current_question_index < (currentRound?.questions.length || 1) - 1) {
      handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1);
    } else if (matchState.current_round_index < matchState.rounds.length - 1) {
      handleChangeQuestion(matchState.current_round_index + 1, 0);
    }
  };

  const handleChangeQuestion = (roundIdx: number, questionIdx: number) => {
    const newState = {
      ...matchState,
      current_round_index: roundIdx,
      current_question_index: questionIdx,
      is_timer_running: false,
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Tiêu đề Bảng MC */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            ĐIỀU KHIỂN TRẬN ĐẤU (BAN GIÁM KHẢO)
          </h1>
          <p className="text-xs text-slate-400 font-medium">{matchState.title}</p>
        </div>

        {/* Nút Chuyển Màn Hình Chờ / Thi Đấu */}
        <Button
          onClick={handleToggleStandby}
          className={`font-bold text-xs h-10 px-4 gap-2 transition-all ${
            matchState.is_standby
              ? "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/20"
              : "bg-blue-600 hover:bg-blue-500 text-white font-bold"
          }`}
        >
          <Tv className="w-4 h-4" />
          {matchState.is_standby ? "MÁY CHIẾU: MÀN HÌNH CHỜ" : "MÁY CHIẾU: ĐANG THI ĐẤU"}
        </Button>
      </div>

      {/* 5 BƯỚC ĐIỀU KHIỂN TUẦN TỰ */}
      <div className="bg-[#0b1329] border-2 border-blue-900/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
          <div className="flex items-center gap-3">
            <select
              value={matchState.current_round_index}
              onChange={(e) => handleChangeQuestion(Number(e.target.value), 0)}
              className="bg-[#060a14] border border-blue-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              {matchState.rounds.map((r, idx) => (
                <option key={r.id} value={idx}>
                  {r.title}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-[#060a14] border border-blue-800 rounded-lg p-0.5">
              <button
                disabled={matchState.current_question_index === 0}
                onClick={() => handleChangeQuestion(matchState.current_round_index, matchState.current_question_index - 1)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-2 text-blue-300">
                Câu {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
              </span>
              <button
                disabled={matchState.current_question_index >= (currentRound?.questions.length || 1) - 1}
                onClick={() => handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-300">
            {matchState.is_scored ? (
              <span className="px-3 py-1 rounded bg-emerald-600/30 text-emerald-400 border border-emerald-500/40">ĐÃ CHẤM ĐIỂM</span>
            ) : matchState.is_revealed ? (
              <span className="px-3 py-1 rounded bg-amber-600/30 text-amber-400 border border-amber-500/40">ĐÃ MỞ ĐÁP ÁN</span>
            ) : matchState.is_locked ? (
              <span className="px-3 py-1 rounded bg-red-600/30 text-red-400 border border-red-500/40">ĐÃ HẾT GIỜ / KHÓA BÀI</span>
            ) : matchState.is_timer_running ? (
              <span className="px-3 py-1 rounded bg-blue-600 text-white animate-pulse">ĐANG ĐẾM NGƯỢC</span>
            ) : (
              <span className="px-3 py-1 rounded bg-slate-800 text-slate-300">SẴN SÀNG</span>
            )}
          </div>
        </div>

        {/* 5 Nút Tiến Trình Lớn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={handleStartTimer}
            className={`h-14 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all ${
              !matchState.is_timer_running && !matchState.is_locked
                ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 scale-102 ring-2 ring-blue-400 cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[10px] opacity-70">BƯỚC 1</span>
            <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5 fill-current" /> BẮT ĐẦU ({currentQuestion?.time_limit}S)</span>
          </button>

          <button
            onClick={handleLockAnswers}
            disabled={matchState.is_locked}
            className={`h-14 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all ${
              matchState.is_timer_running && !matchState.is_locked
                ? "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/30 ring-2 ring-red-400 cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[10px] opacity-70">BƯỚC 2</span>
            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> KHÓA BÀI</span>
          </button>

          <button
            onClick={handleRevealAnswers}
            disabled={matchState.is_revealed}
            className={`h-14 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all ${
              matchState.is_locked && !matchState.is_revealed
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[10px] opacity-70">BƯỚC 3</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> MỞ ĐÁP ÁN</span>
          </button>

          <button
            onClick={handleAutoGrade}
            disabled={matchState.is_scored}
            className={`h-14 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all ${
              matchState.is_revealed && !matchState.is_scored
                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400 cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[10px] opacity-70">BƯỚC 4</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> CHẤM ĐIỂM TỰ ĐỘNG</span>
          </button>

          <button
            onClick={handleNextQuestion}
            className={`h-14 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all ${
              matchState.is_scored
                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400 cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[10px] opacity-70">BƯỚC 5</span>
            <span>CÂU TIẾP THEO ➔</span>
          </button>
        </div>
      </div>

      {/* Câu Hỏi & Đáp Án Chuẩn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#0b1329] border border-blue-900/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="font-bold uppercase text-blue-400">NỘI DUNG CÂU HỎI</span>
            <span>+{currentQuestion?.points_correct}đ đúng / -{currentQuestion?.points_wrong}đ sai</span>
          </div>
          <p className="text-base font-bold text-white leading-relaxed">
            {currentQuestion?.question_text}
          </p>
          <div className="p-3 bg-[#060a14] rounded-xl border border-emerald-500/40">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Đáp án đúng:</span>
            <span className="text-base font-black text-emerald-300">{currentQuestion?.correct_answer}</span>
          </div>
        </div>

        {/* Trạng Thái Chuông */}
        <div className="bg-[#0b1329] border border-blue-900/60 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">CHUÔNG BÁO GIÀNH QUYỀN</span>
          {matchState.buzzer_winner_slot ? (
            <div className="p-4 rounded-xl bg-amber-500 text-black text-center space-y-2">
              <span className="font-black text-lg block">THÍ SINH {matchState.buzzer_winner_slot}</span>
              <span className="text-xs font-mono font-bold block">Thời gian: {(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s</span>
              <button
                onClick={handleResetBuzzer}
                className="w-full py-1.5 rounded-lg bg-black text-white font-bold text-xs cursor-pointer"
              >
                Reset Chuông
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 font-medium italic">
              Chưa có thí sinh bấm chuông
            </div>
          )}
        </div>
      </div>

      {/* Giám Sát 4 Máy Thí Sinh */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          GIÁM SÁT 4 MÁY THÍ SINH
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            return (
              <div
                key={player.slot_number}
                className={`bg-[#0b1329] border-2 ${
                  resp?.is_correct === true
                    ? "border-emerald-500 bg-emerald-950/20"
                    : resp?.is_correct === false
                    ? "border-red-500 bg-red-950/20"
                    : "border-blue-900/60"
                } rounded-2xl p-4 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-black text-xs">
                    VỊ TRÍ {player.slot_number}
                  </span>
                  <span className="font-mono text-base font-black text-amber-400">
                    {player.score} đ
                  </span>
                </div>

                <div className="font-bold text-sm text-white line-clamp-1">
                  {player.name}
                </div>

                <div className="p-3 rounded-xl bg-[#060a14] border border-slate-800 min-h-[50px] flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Đáp án nộp:</span>
                  {resp ? (
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white uppercase line-clamp-1">{resp.answer_text}</span>
                      <span className="text-[10px] font-mono text-slate-400">{(resp.response_time_ms / 1000).toFixed(2)}s</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Chưa nộp</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleManualGrade(player.slot_number, true)}
                    className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                  </button>
                  <button
                    onClick={() => handleManualGrade(player.slot_number, false)}
                    className="py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Sai
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <span>Chỉnh điểm:</span>
                  <div className="flex gap-1 font-mono">
                    <button onClick={() => handleScoreOverride(player.slot_number, 10)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">+10</button>
                    <button onClick={() => handleScoreOverride(player.slot_number, -10)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">-10</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}