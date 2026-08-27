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
  Sliders,
  ExternalLink,
  Settings,
  Bell,
  Sparkles,
  QrCode,
  X,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminLivePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);

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

  // Sinh mã PIN ngẫu nhiên 4 số cho 4 máy
  const handleGenerateRandomPins = () => {
    const updatedPlayers = matchState.players.map((p) => {
      const randPin = String(Math.floor(1000 + Math.random() * 9000));
      return { ...p, pin_code: randPin };
    });

    const newState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleCopyLink = (slot: number, pin: string) => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const joinUrl = `${origin}/join?slot=${slot}&pin=${pin}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedSlot(slot);
      setTimeout(() => setCopiedSlot(null), 2000);
    }
  };

  const handleStartTimer = () => {
    const timeLimit = currentQuestion?.time_limit || 15;
    const newState: MatchState = {
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 font-sans relative">
      {/* MODAL QR CODE & MÃ PIN RANDOM 4 MÁY */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  Mã Bí Mật & Kết Nối 4 Máy Thí Sinh
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Cung cấp mã PIN hoặc copy link gửi cho thí sinh quét vào máy
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateRandomPins}
                  className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 text-xs h-8 gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Sinh Mã PIN Random Mới
                </Button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {matchState.players.map((p) => {
                  const pin = p.pin_code || `${p.slot_number}${p.slot_number}${p.slot_number}${p.slot_number}`;
                  return (
                    <div key={p.slot_number} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          Thí Sinh Vị Trí {p.slot_number}
                        </Badge>
                        <span className="text-xs text-zinc-400 font-medium line-clamp-1 max-w-[120px]">
                          {p.name}
                        </span>
                      </div>

                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                        <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                          MÃ BÍ MẬT (PIN CODE)
                        </span>
                        <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                          {pin}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyLink(p.slot_number, pin)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-xs h-8 gap-1.5"
                      >
                        {copiedSlot === p.slot_number ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy Link!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Link Vào Máy TS {p.slot_number}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                Bảng Điều Khiển Trận Đấu MC
              </h1>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                Realtime Active
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">{matchState.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowQRModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" /> Mã PIN & Link 4 Máy
          </Button>
          <Link href="/display" target="_blank">
            <Button variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-800 gap-1.5 text-xs text-zinc-300">
              <ExternalLink className="w-3.5 h-3.5" /> Mở Máy Chiếu
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-800 gap-1.5 text-xs text-zinc-300">
              <Settings className="w-3.5 h-3.5" /> Soạn Đề
            </Button>
          </Link>
        </div>
      </header>

      {/* 5 BƯỚC ĐIỀU KHIỂN LOGIC */}
      <Card className="border-zinc-800 bg-zinc-900/70 mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-3">
              <select
                value={matchState.current_round_index}
                onChange={(e) => handleChangeQuestion(Number(e.target.value), 0)}
                className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-200"
              >
                {matchState.rounds.map((r, idx) => (
                  <option key={r.id} value={idx}>
                    {r.title}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 border border-zinc-800 rounded-md bg-zinc-950 p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                  disabled={matchState.current_question_index === 0}
                  onClick={() =>
                    handleChangeQuestion(matchState.current_round_index, matchState.current_question_index - 1)
                  }
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium px-2 text-zinc-300">
                  Câu {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                  disabled={matchState.current_question_index >= (currentRound?.questions.length || 1) - 1}
                  onClick={() =>
                    handleChangeQuestion(matchState.current_round_index, matchState.current_question_index + 1)
                  }
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Trạng thái:</span>
              {matchState.is_scored ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Đã Chấm Điểm</Badge>
              ) : matchState.is_revealed ? (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Đã Mở Đáp Án</Badge>
              ) : matchState.is_locked ? (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Đã Khóa Máy</Badge>
              ) : matchState.is_timer_running ? (
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">Đang Đếm Ngược</Badge>
              ) : (
                <Badge variant="outline" className="border-zinc-700 text-zinc-400">Sẵn Sàng</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <Button
              onClick={handleStartTimer}
              className={`h-11 font-bold text-xs gap-1.5 flex flex-col items-center justify-center ${
                !matchState.is_timer_running && !matchState.is_locked
                  ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 ring-2 ring-zinc-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>1. BẮT ĐẦU ({currentQuestion?.time_limit}S)</span>
              </div>
            </Button>

            <Button
              variant="secondary"
              onClick={handleLockAnswers}
              disabled={matchState.is_locked}
              className={`h-11 font-bold text-xs gap-1.5 flex flex-col items-center justify-center ${
                matchState.is_timer_running && !matchState.is_locked
                  ? "bg-red-600 text-white hover:bg-red-500 ring-2 ring-red-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>2. KHÓA BÀI</span>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleRevealAnswers}
              disabled={matchState.is_revealed}
              className={`h-11 font-bold text-xs gap-1.5 flex flex-col items-center justify-center ${
                matchState.is_locked && !matchState.is_revealed
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-400 hover:bg-amber-500/30"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>3. MỞ ĐÁP ÁN</span>
              </div>
            </Button>

            <Button
              onClick={handleAutoGrade}
              disabled={matchState.is_scored}
              className={`h-11 font-bold text-xs gap-1.5 flex flex-col items-center justify-center ${
                matchState.is_revealed && !matchState.is_scored
                  ? "bg-blue-600 text-white hover:bg-blue-500 ring-2 ring-blue-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>4. CHẤM ĐIỂM</span>
              </div>
            </Button>

            <Button
              onClick={handleNextQuestion}
              className={`h-11 font-bold text-xs gap-1.5 flex flex-col items-center justify-center ${
                matchState.is_scored
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>5. CÂU TIẾP ➔</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Câu hỏi & Chuông */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-300 uppercase text-[10px]">
                {currentQuestion?.question_type}
              </Badge>
              <span className="text-xs text-zinc-500">
                Thời gian: {currentQuestion?.time_limit}s • Đúng: +{currentQuestion?.points_correct}đ | Sai: -{currentQuestion?.points_wrong}đ
              </span>
            </div>
            <CardTitle className="text-base font-semibold text-zinc-100 pt-2">
              {currentQuestion?.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3.5">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Đáp Án Chuẩn Giám Khảo:
              </span>
              <p className="text-sm font-bold text-zinc-100">{currentQuestion?.correct_answer}</p>
              {currentQuestion?.explanation && (
                <p className="text-xs text-zinc-400 mt-1 italic">{currentQuestion.explanation}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Buzzer Box */}
        <Card className="border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Trạng Thái Bấm Chuông
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchState.buzzer_winner_slot ? (
              <div className="rounded-lg bg-zinc-950 border border-amber-500/40 p-4 text-center">
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 mb-1">
                  Đã Giành Quyền
                </Badge>
                <div className="text-lg font-bold text-zinc-100">
                  Thí sinh {matchState.buzzer_winner_slot}
                </div>
                <div className="text-xs font-mono text-zinc-500 mb-3">
                  {(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetBuzzer}
                  className="border-zinc-800 hover:bg-zinc-800 text-xs h-7 gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Chuông
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-950 border border-zinc-850 p-6 text-center text-xs text-zinc-500 italic">
                Chưa có thí sinh nào bấm chuông
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4 Contestants Live Telemetry */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Giám Sát Trực Tiếp 4 Thí Sinh
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            return (
              <Card
                key={player.slot_number}
                className={`border-zinc-800 bg-zinc-900/40 transition-all ${
                  resp?.is_correct === true
                    ? "border-emerald-500/60 bg-emerald-950/10"
                    : resp?.is_correct === false
                    ? "border-red-500/60 bg-red-950/10"
                    : ""
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 font-mono text-xs">
                      Vị trí {player.slot_number}
                    </Badge>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {player.score} đ
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-zinc-200 line-clamp-1 pt-1">
                    {player.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="rounded-md bg-zinc-950 border border-zinc-850 p-2.5 min-h-[56px] flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-500 uppercase block">Đáp án thí sinh:</span>
                    {resp ? (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-zinc-100 uppercase line-clamp-1">
                          {resp.answer_text}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {(resp.response_time_ms / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 italic">Chưa nộp</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualGrade(player.slot_number, true)}
                      className="border-emerald-800/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 text-xs h-7 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Đúng
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualGrade(player.slot_number, false)}
                      className="border-red-800/40 bg-red-950/20 text-red-400 hover:bg-red-900/30 text-xs h-7 gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Sai
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs text-zinc-500">
                    <span>Chỉnh điểm:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleScoreOverride(player.slot_number, 10)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px]"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleScoreOverride(player.slot_number, -10)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px]"
                      >
                        -10
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}