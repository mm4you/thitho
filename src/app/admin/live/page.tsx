"use client";

import { useEffect, useState, useRef } from "react";
import {
  subscribeToGameChannel,
  sendGameEvent,
  loadSavedMatchState,
  saveMatchStateLocally,
  syncMatchStateToCloud,
} from "@/lib/supabase";
import { sound } from "@/lib/sounds";
import { MatchState, RealtimeEventPayload, Question } from "@/types/game";
import {
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Tv,
  RotateCcw,
  Sparkles,
  Clock,
  Check,
  Volume2,
  VolumeX,
  Bell,
  CheckCheck,
  XCircle,
  Edit3,
  Plus,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const stateRef = useRef<MatchState>(matchState);
  stateRef.current = matchState;

  const [customTimeInput, setCustomTimeInput] = useState<string>("15");
  const [savedTimeAlert, setSavedTimeAlert] = useState<string>("");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Edit Question Modal State
  const [isEditingCurrentQuestion, setIsEditingCurrentQuestion] = useState<boolean>(false);
  const [editQuestionText, setEditQuestionText] = useState<string>("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<string>("");

  useEffect(() => {
    saveMatchStateLocally(matchState);
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  useEffect(() => {
    if (currentQuestion?.time_limit) {
      setCustomTimeInput(String(currentQuestion.time_limit));
    }
  }, [matchState.current_round_index, matchState.current_question_index, currentQuestion?.time_limit]);

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
    syncMatchStateToCloud(newState);

    sendGameEvent({ type: "LOCK_ANSWERS" });
    sendGameEvent({ type: "REVEAL_ANSWERS" });
    sendGameEvent({ type: "GRADE_ANSWERS", results });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (matchState.is_timer_running && matchState.time_left > 0) {
      interval = setInterval(() => {
        setMatchState((prev) => {
          const nextTime = prev.time_left - 1; if (nextTime > 0) { sound.playTick(); } else if (nextTime === 0) { sound.playTimeUp(); }
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
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "TOGGLE_STANDBY", is_standby: newStandby });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleApplyCustomTime = (seconds: number, applyAllInRound = false) => {
    const validSec = Math.max(1, Math.min(300, seconds || 15));
    setCustomTimeInput(String(validSec));

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === matchState.current_round_index) {
        return {
          ...r,
          questions: r.questions.map((q, qIdx) => {
            if (applyAllInRound || qIdx === matchState.current_question_index) {
              return { ...q, time_limit: validSec };
            }
            return q;
          }),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });

    setSavedTimeAlert(applyAllInRound ? `Đã chỉnh ${validSec}s cho cả vòng!` : `Đã chỉnh ${validSec}s cho câu này!`);
    setTimeout(() => setSavedTimeAlert(""), 2500);
  };

  const handleStartQuestion = () => {
    const timeLimit = Math.max(1, Number(customTimeInput) || currentQuestion?.time_limit || 15);
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
    setCustomTimeInput(String(newLimit));

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

  // Ban Giam Khao sua nhanh cau hoi truc tiep
  const handleOpenEditQuestion = () => {
    setEditQuestionText(currentQuestion?.question_text || "");
    setEditCorrectAnswer(currentQuestion?.correct_answer || "");
    setIsEditingCurrentQuestion(true);
  };

  const handleSaveEditedQuestion = () => {
    if (!editQuestionText.trim()) return;

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === matchState.current_round_index) {
        return {
          ...r,
          questions: r.questions.map((q, qIdx) => {
            if (qIdx === matchState.current_question_index) {
              return {
                ...q,
                question_text: editQuestionText.trim(),
                correct_answer: editCorrectAnswer.trim(),
              };
            }
            return q;
          }),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    setIsEditingCurrentQuestion(false);
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

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    sound.setMuted(next);
  };

  const activeTimeLimit = Number(customTimeInput) || 15;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans select-none">
      {/* Modal Ban Giam Khao Sua Nhanh Cau Hoi */}
      {isEditingCurrentQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d121f] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                SỬA CÂU HỎI {matchState.current_question_index + 1} ({currentRound?.title})
              </h2>
              <button onClick={() => setIsEditingCurrentQuestion(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  NỘI DUNG CÂU HỎI:
                </label>
                <textarea
                  rows={3}
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className="w-full bg-[#070a12] border border-slate-800 rounded-xl p-3 text-sm text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-400 uppercase block mb-1">
                  ĐÁP ÁN ĐÚNG CHUẨN:
                </label>
                <input
                  type="text"
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="w-full bg-[#070a12] border border-emerald-500/50 rounded-xl px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingCurrentQuestion(false)} className="text-xs text-slate-400">
                Hủy
              </Button>
              <Button size="sm" onClick={handleSaveEditedQuestion} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 gap-1.5 rounded-xl cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tiêu đề Bàn Giám Khảo */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            BÀN ĐIỀU HÀNH TRẬN ĐẤU (BAN GIÁM KHẢO)
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Tự động chấm điểm 100% • Tự do nhập & tùy chỉnh thời gian từng vòng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleAudio}
            variant="outline"
            className="border-slate-800 text-slate-300 hover:text-white text-xs h-9 px-3 gap-1.5 cursor-pointer"
            title="Bật / Tắt âm thanh"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isAudioMuted ? "Đã Tắt Âm" : "Bật Âm Thanh"}</span>
          </Button>

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
      </div>

      {/* THANH THỬ ÂM THANH STUDIO TRỰC TIẾP */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Nghe thử âm thanh Studio:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => sound.playTick()} className="px-2.5 py-1 rounded bg-[#070a12] border border-slate-800 hover:text-white text-slate-300 cursor-pointer">
            Gõ Đồng Hồ
          </button>
          <button onClick={() => sound.playBuzzer()} className="px-2.5 py-1 rounded bg-[#070a12] border border-slate-800 hover:text-amber-300 text-amber-400 font-bold flex items-center gap-1 cursor-pointer">
            <Bell className="w-3 h-3" /> Chuông Giành Quyền
          </button>
          <button onClick={() => sound.playCorrect()} className="px-2.5 py-1 rounded bg-[#070a12] border border-slate-800 hover:text-emerald-300 text-emerald-400 font-bold flex items-center gap-1 cursor-pointer">
            <CheckCheck className="w-3 h-3" /> Đúng (Fanfare)
          </button>
          <button onClick={() => sound.playWrong()} className="px-2.5 py-1 rounded bg-[#070a12] border border-slate-800 hover:text-red-300 text-red-400 flex items-center gap-1 cursor-pointer">
            <XCircle className="w-3 h-3" /> Báo Sai
          </button>
          <button onClick={() => sound.playTimeUp()} className="px-2.5 py-1 rounded bg-[#070a12] border border-slate-800 hover:text-white text-slate-300 cursor-pointer">
            Hết Giờ (Gong)
          </button>
        </div>
      </div>

      {/* KHU VỰC TÙY CHỈNH THỜI GIAN TỪNG VÒNG */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white uppercase block">TÙY CHỈNH THỜI GIAN VÒNG:</span>
              <span className="text-[11px] text-slate-400 font-medium">{currentRound?.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">NHẬP GIÂY:</span>
            <input
              type="number"
              min={1}
              max={300}
              disabled={matchState.is_timer_running}
              value={customTimeInput}
              onChange={(e) => setCustomTimeInput(e.target.value)}
              onBlur={() => handleApplyCustomTime(Number(customTimeInput), false)}
              className="w-16 h-9 rounded-lg bg-[#070a12] border border-slate-700 px-2 text-center font-mono font-bold text-sm text-amber-400 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400 font-mono">giây</span>

            <Button
              size="sm"
              disabled={matchState.is_timer_running}
              onClick={() => handleApplyCustomTime(Number(customTimeInput), false)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-3 rounded-lg font-semibold cursor-pointer"
            >
              Lưu Câu Này
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={matchState.is_timer_running}
              onClick={() => handleApplyCustomTime(Number(customTimeInput), true)}
              className="border-slate-700 text-slate-300 hover:text-white text-xs h-9 px-3 rounded-lg font-semibold cursor-pointer"
            >
              Lưu Cả Vòng
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Mốc nhanh:</span>
          {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((sec) => (
            <button
              key={sec}
              disabled={matchState.is_timer_running}
              onClick={() => handleApplyCustomTime(sec, false)}
              className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold transition-colors cursor-pointer ${
                activeTimeLimit === sec
                  ? "bg-amber-500 text-black"
                  : "bg-[#070a12] border border-slate-800 text-slate-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40"
              }`}
            >
              {sec}s
            </button>
          ))}

          {savedTimeAlert && (
            <span className="ml-auto text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> {savedTimeAlert}
            </span>
          )}
        </div>
      </div>

      {/* KHU VỰC THAO TÁC BAN GIÁM KHẢO */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <select
              value={matchState.current_round_index}
              onChange={(e) => handleChangeQuestion(Number(e.target.value), 0)}
              className="bg-[#070a12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none cursor-pointer"
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
              <span className="text-xs text-slate-500 font-medium">Thời gian thi đấu: {activeTimeLimit}s</span>
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
              BẮT ĐẦU CÂU HỎI ({activeTimeLimit} GIÂY)
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
              Chạy Lại Câu Này ({activeTimeLimit}s)
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

      {/* Câu Hỏi & Đáp Án Chuẩn - Cho phép Ban Giam Khao sua nhanh */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="font-bold uppercase text-blue-400">NỘI DUNG CÂU HỎI</span>
          <div className="flex items-center gap-3">
            <span>+{currentQuestion?.points_correct}đ đúng / -{currentQuestion?.points_wrong}đ sai</span>
            <button
              onClick={handleOpenEditQuestion}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 underline cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Sửa câu này
            </button>
          </div>
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