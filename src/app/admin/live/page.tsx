"use client";

import { useEffect, useState, useRef } from "react";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Tv,
  RotateCcw,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const stateRef = useRef<MatchState>(matchState);
  stateRef.current = matchState;

  // Custom Time State
  const [customTimeLimit, setCustomTimeLimit] = useState<number>(15);

  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  useEffect(() => {
    if (currentQuestion?.time_limit) {
      setCustomTimeLimit(currentQuestion.time_limit);
    }
  }, [matchState.current_round_index, matchState.current_question_index, currentQuestion?.time_limit]);

  // Ham tu dong cham diem 100% cho 4 thi sinh
  const executeAutoGrade = (currentState: MatchState) => {
    const round = currentState.rounds[currentState.current_round_index] || currentState.rounds[0];
    const question = round?.questions[currentState.current_question_index] || round?.questions[0];
    if (!question) return;

    const isTangToc = round.round_type === "tang_toc";
    const correctAnswers = question.correct_answer.toLowerCase().trim();

    const submissions = Object.values(currentState.current_responses);
    const correctSubmissions = submissions
      .filter((sub) => {
        const text = sub.answer_text.toLowerCase().trim();
        return (
          text.includes(correctAnswers) ||
          correctAnswers.includes(text) ||
          (question.options && sub.answer_text.startsWith(question.correct_answer[0]))
        );
      })
      .sort((a, b) => a.response_time_ms - b.response_time_ms);

    const results: Record<number, { is_correct: boolean; points_awarded: number }> = {};
    const tangTocPoints = [40, 30, 20, 10];

    currentState.players.forEach((p) => {
      const resp = currentState.current_responses[p.slot_number];
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
          points = question.points_correct;
        }
      } else {
        points = -question.points_wrong;
      }

      results[p.slot_number] = { is_correct: isCorrect, points_awarded: points };
    });

    const updatedPlayers = currentState.players.map((p) => ({
      ...p,
      score: p.score + (results[p.slot_number]?.points_awarded || 0),
    }));

    const updatedResponses = { ...currentState.current_responses };
    Object.keys(results).forEach((k) => {
      const slot = Number(k);
      if (updatedResponses[slot]) {
        updatedResponses[slot].is_correct = results[slot].is_correct;
        updatedResponses[slot].points_awarded = results[slot].points_awarded;
      }
    });

    const newState: MatchState = {
      ...currentState,
      is_locked: true,
      is_revealed: true,
      is_scored: true,
      is_timer_running: false,
      players: updatedPlayers,
      current_responses: updatedResponses,
    };

    setMatchState(newState);
    saveMatchStateLocally(newState);

    sendGameEvent({ type: "LOCK_ANSWERS" });
    sendGameEvent({ type: "REVEAL_ANSWERS" });
    sendGameEvent({ type: "GRADE_ANSWERS", results });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  // Tu dong dem nguoc tren may MC va TU DONG CHAM DIEM khi het gio
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (matchState.is_timer_running && matchState.time_left > 0) {
      interval = setInterval(() => {
        setMatchState((prev) => {
          const nextTime = prev.time_left - 1;
          if (nextTime <= 0) {
            setTimeout(() => {
              executeAutoGrade(stateRef.current);
            }, 100);
            return { ...prev, time_left: 0, is_timer_running: false, is_locked: true };
          }
          return { ...prev, time_left: nextTime };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchState.is_timer_running, matchState.time_left]);

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

  const handleToggleStandby = () => {
    const newStandby = !matchState.is_standby;
    const newState = { ...matchState, is_standby: newStandby };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "TOGGLE_STANDBY", is_standby: newStandby });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  // Đổi nhanh thời gian cho câu hiện tại hoặc toàn bộ vòng thi
  const handleQuickSetTime = (seconds: number, applyAllInRound = false) => {
    setCustomTimeLimit(seconds);

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === matchState.current_round_index) {
        return {
          ...r,
          questions: r.questions.map((q, qIdx) => {
            if (applyAllInRound || qIdx === matchState.current_question_index) {
              return { ...q, time_limit: seconds };
            }
            return q;
          }),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleStartQuestion = () => {
    const timeLimit = customTimeLimit || currentQuestion?.time_limit || 15;
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

  const handleManualLockAndGradeNow = () => {
    executeAutoGrade(stateRef.current);
  };

  const handleNextQuestion = () => {
    if (matchState.current_question_index < (currentRound?.questions.length || 1) - 1) {
      handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1);
    } else if (matchState.current_round_index < matchState.rounds.length - 1) {
      handleChangeQuestion(matchState.current_round_index + 1, 0);
    }
  };

  const handleChangeQuestion = (roundIdx: number, questionIdx: number) => {
    const round = matchState.rounds[roundIdx] || matchState.rounds[0];
    const question = round?.questions[questionIdx] || round?.questions[0];
    const newLimit = question?.time_limit || 15;
    setCustomTimeLimit(newLimit);

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
    <div className="space-y-6 max-w-5xl mx-auto font-sans select-none">
      {/* Tiêu đề Bảng MC */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            BẢNG ĐIỀU KHIỂN TRẬN ĐẤU (MC)
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Tự động chấm điểm 100% • Tùy chỉnh thời gian nhanh cho từng vòng
          </p>
        </div>

        <Button
          onClick={handleToggleStandby}
          className={`font-semibold text-xs h-9 px-4 gap-2 transition-all ${
            matchState.is_standby
              ? "bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          <Tv className="w-4 h-4" />
          {matchState.is_standby ? "MÁY CHIẾU: MÀN HÌNH CHỜ" : "MÁY CHIẾU: ĐANG THI ĐẤU"}
        </Button>
      </div>

      {/* THANH CHỈNH THỜI GIAN NHANH CHO VÒNG THI */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-white uppercase block">CHỈNH THỜI GIAN NHANH CHO VÒNG:</span>
            <span className="text-[11px] text-slate-400 font-medium">{currentRound?.title}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[5, 10, 15, 20, 30, 45, 60].map((sec) => (
            <button
              key={sec}
              disabled={matchState.is_timer_running}
              onClick={() => handleQuickSetTime(sec, false)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                customTimeLimit === sec
                  ? "bg-amber-500 text-black shadow-sm"
                  : "bg-[#070a12] border border-slate-800 text-slate-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40"
              }`}
            >
              {sec}s
            </button>
          ))}

          <button
            disabled={matchState.is_timer_running}
            onClick={() => handleQuickSetTime(customTimeLimit, true)}
            className="ml-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer disabled:opacity-40"
            title="Áp dụng số giây này cho tất cả các câu trong vòng thi này"
          >
            Áp Dụng Cho Cả Vòng
          </button>
        </div>
      </div>

      {/* KHU VỰC THAO TÁC MC SIÊU TINH GỌN */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <select
              value={matchState.current_round_index}
              onChange={(e) => handleChangeQuestion(Number(e.target.value), 0)}
              className="bg-[#070a12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              {matchState.rounds.map((r, idx) => (
                <option key={r.id} value={idx}>
                  {r.title}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-[#070a12] border border-slate-800 rounded-lg p-0.5">
              <button
                disabled={matchState.current_question_index === 0}
                onClick={() => handleChangeQuestion(matchState.current_round_index, matchState.current_question_index - 1)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2 text-slate-200">
                Câu {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
              </span>
              <button
                disabled={matchState.current_question_index >= (currentRound?.questions.length || 1) - 1}
                onClick={() => handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {matchState.is_timer_running ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-400 text-xs font-bold animate-pulse">
                ĐANG ĐẾM NGƯỢC: {matchState.time_left}s
              </div>
            ) : matchState.is_scored ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/60 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> ĐÃ TỰ ĐỘNG CHẤM ĐIỂM
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Thời gian: {customTimeLimit}s</span>
            )}
          </div>
        </div>

        {/* 2 NÚT ĐIỀU KHIỂN CHÍNH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!matchState.is_timer_running && !matchState.is_scored ? (
            <button
              onClick={handleStartQuestion}
              className="h-16 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              BẮT ĐẦU CÂU HỎI ({customTimeLimit} GIÂY)
            </button>
          ) : matchState.is_timer_running ? (
            <button
              onClick={handleManualLockAndGradeNow}
              className="h-16 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              KHÓA & CHẤM ĐIỂM NGAY LẬP TỨC
            </button>
          ) : (
            <button
              onClick={handleStartQuestion}
              className="h-16 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Chạy Lại Câu Này ({customTimeLimit}s)
            </button>
          )}

          <button
            onClick={handleNextQuestion}
            className="h-16 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>CHUYỂN SANG CÂU TIẾP THEO</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Câu Hỏi & Đáp Án Chuẩn */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="font-bold uppercase text-blue-400">NỘI DUNG CÂU HỎI</span>
          <span>+{currentQuestion?.points_correct}đ đúng / -{currentQuestion?.points_wrong}đ sai</span>
        </div>
        <p className="text-base font-bold text-white leading-relaxed">
          {currentQuestion?.question_text}
        </p>
        <div className="p-3 bg-[#070a12] rounded-xl border border-emerald-500/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">ĐÁP ÁN ĐÚNG:</span>
            <span className="text-base font-bold text-emerald-200">{currentQuestion?.correct_answer}</span>
          </div>
          {matchState.buzzer_winner_slot && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-amber-500 text-black font-bold text-xs">
                TS {matchState.buzzer_winner_slot} Giành quyền
              </span>
              <button onClick={handleResetBuzzer} className="text-xs text-slate-400 hover:text-white underline cursor-pointer">
                Reset Chuông
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Giám Sát Kết Quả Chấm Điểm 4 Thí Sinh */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          KẾT QUẢ 4 THÍ SINH (TỰ ĐỘNG CHẤM & CỘNG ĐIỂM)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            return (
              <div
                key={player.slot_number}
                className={`bg-[#0d121f] border ${
                  resp?.is_correct === true
                    ? "border-emerald-500/80 bg-emerald-950/20"
                    : resp?.is_correct === false
                    ? "border-red-500/80 bg-red-950/20"
                    : "border-slate-800"
                } rounded-xl p-4 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">
                    {player.slot_number}. {player.name}
                  </span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {player.score} đ
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#070a12] border border-slate-800 min-h-[46px] flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Đáp án nộp:</span>
                  {resp ? (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white uppercase line-clamp-1">{resp.answer_text}</span>
                      <span className="text-[10px] font-mono text-slate-400">{(resp.response_time_ms / 1000).toFixed(2)}s</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Chưa nộp</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs text-slate-400">
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