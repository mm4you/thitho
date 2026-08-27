"use client";

import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Trophy,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  QrCode,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [originUrl, setOriginUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next > 0 && next <= 5) {
            sound.playTick();
          } else if (next === 0) {
            sound.playTimeUp();
            setIsTimerActive(false);
          }
          return Math.max(0, next);
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeLeft]);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
        setTimeLeft(event.state.time_left);
        setIsTimerActive(event.state.is_timer_running);
      } else if (event.type === "TOGGLE_STANDBY") {
        setMatchState((prev) => ({ ...prev, is_standby: event.is_standby }));
      } else if (event.type === "START_TIMER") {
        setTimeLimit(event.time_limit);
        setTimeLeft(event.time_limit);
        setIsTimerActive(true);
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
        setIsTimerActive(false);
        sound.playTimeUp();
        setMatchState((prev) => ({ ...prev, is_locked: true, is_timer_running: false }));
      } else if (event.type === "REVEAL_ANSWERS") {
        sound.playReveal();
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
      } else if (event.type === "GRADE_ANSWERS") {
        let hasCorrect = false;
        const updatedPlayers = matchState.players.map((p) => {
          const res = event.results[p.slot_number];
          if (res?.is_correct) hasCorrect = true;
          return res ? { ...p, score: p.score + res.points_awarded } : p;
        });

        const updatedResponses = { ...matchState.current_responses };
        Object.keys(event.results).forEach((k) => {
          const slot = Number(k);
          if (updatedResponses[slot]) {
            updatedResponses[slot].is_correct = event.results[slot].is_correct;
            updatedResponses[slot].points_awarded = event.results[slot].points_awarded;
          }
        });

        if (hasCorrect) {
          sound.playCorrect();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } else {
          sound.playWrong();
        }

        setMatchState((prev) => ({
          ...prev,
          is_scored: true,
          players: updatedPlayers,
          current_responses: updatedResponses,
        }));
      } else if (event.type === "PRESS_BUZZER") {
        sound.playBuzzer();
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
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({ ...prev, buzzer_winner_slot: null, buzzer_winner_time_ms: null }));
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, score: p.score + event.delta } : p
          ),
        }));
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
        const round = matchState.rounds[event.round_index] || matchState.rounds[0];
        const question = round.questions[event.question_index] || round.questions[0];
        const newLimit = question?.time_limit || 15;
        setTimeLimit(newLimit);
        setTimeLeft(newLimit);
        setIsTimerActive(false);

        setMatchState((prev) => ({
          ...prev,
          current_round_index: event.round_index,
          current_question_index: event.question_index,
          is_locked: false,
          is_revealed: false,
          is_scored: false,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
          current_responses: {},
        }));
      }
    });

    return () => unsubscribe();
  }, [matchState]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  // -------------------------------------------------------------
  // 1. GIAO DIỆN CHỜ SÂN KHẤU (STANDBY LOBBY STAGE)
  // -------------------------------------------------------------
  if (matchState.is_standby) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-8 md:p-12 font-sans selection:bg-zinc-800 relative overflow-hidden select-none">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-lg">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-100">
                ĐẤU TRÍ ARENA
              </h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide">
                HỘI THI TRÍ TUỆ TRỰC TIẾP
              </p>
            </div>
          </div>

          <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs px-3 py-1 font-semibold">
            Sẵn Sàng Bắt Đầu
          </Badge>
        </header>

        {/* Main Stage: 4 Contestants Intro */}
        <main className="my-auto py-8 relative z-10 space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1">
              CHÀO ĐÓN 4 THÍ SINH
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-50">
              {matchState.title || "Vòng Chung Kết Tranh Tài"}
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              Chuẩn bị bước vào phần thi đấu trí tuệ đỉnh cao
            </p>
          </div>

          {/* 4 Contestants Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {matchState.players.map((player) => (
              <Card
                key={player.slot_number}
                className="border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-2xl overflow-hidden hover:border-zinc-700 transition-all text-center p-5 space-y-4 relative group"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-zinc-700 mx-auto flex items-center justify-center font-black text-2xl text-zinc-100 shadow-inner">
                  {player.slot_number}
                </div>

                <div className="space-y-1">
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-950 text-[10px] text-zinc-400 font-mono">
                    VỊ TRÍ {player.slot_number}
                  </Badge>
                  <h3 className="text-xl font-bold text-zinc-100 line-clamp-1">
                    {player.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-1">
                    {player.school_name || "Đại diện trường"}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                    ĐIỂM SỐ HIỆN TẠI
                  </span>
                  <span className="font-mono text-3xl font-black text-amber-400">
                    {player.score}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </main>

        {/* Footer info */}
        <footer className="border-t border-zinc-800/80 pt-6 flex items-center justify-between text-xs text-zinc-500 relative z-10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span>4 Thí sinh đã sẵn sàng tại vị trí</span>
          </div>
          <div>MC đang điều phối • Sẵn sàng chuyển vào câu hỏi</div>
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. GIAO DIỆN THI ĐẤU (IN-GAME STAGE SCREEN)
  // -------------------------------------------------------------
  const timerProgress = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-zinc-800 relative overflow-hidden select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-100">
              {currentRound?.title}
            </h1>
            <p className="text-xs text-zinc-400">
              Câu {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}
            </p>
          </div>
        </div>

        {/* Buzzer Alert */}
        {matchState.buzzer_winner_slot ? (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl animate-bounce">
            <Zap className="w-5 h-5 fill-current" />
            <span className="font-bold text-sm">
              THÍ SINH {matchState.buzzer_winner_slot} GIÀNH QUYỀN TRẢ LỜI! ({(matchState.buzzer_winner_time_ms! / 1000).toFixed(2)}s)
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-400 text-xs px-3 py-1 font-mono">
            {currentQuestion?.question_type === "buzzer" ? "VÒNG BẤM CHUÔNG" : "VÒNG NHẬP ĐÁP ÁN"}
          </Badge>
        )}
      </header>

      {/* Main Question & Timer Center */}
      <main className="my-auto py-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Timer Radial & Counter */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-zinc-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? "stroke-red-500" : "stroke-amber-400"
                }`}
                strokeWidth="8"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * timerProgress) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span
              className={`absolute font-mono text-4xl font-black ${
                timeLeft <= 5 ? "text-red-400 animate-ping" : "text-zinc-100"
              }`}
            >
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Question Text Box */}
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-2xl p-6 md:p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-50 leading-relaxed">
            {currentQuestion?.question_text}
          </h2>

          {/* Multiple choice options */}
          {currentQuestion?.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border text-left text-sm font-semibold transition-all ${
                    matchState.is_revealed && opt.startsWith(currentQuestion.correct_answer[0])
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-300"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {/* Reveal Correct Answer */}
          {matchState.is_revealed && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center animate-in fade-in">
              <span className="text-xs uppercase font-semibold text-emerald-400 block mb-1">
                ĐÁP ÁN CHÍNH XÁC:
              </span>
              <span className="text-xl font-black text-emerald-300">
                {currentQuestion?.correct_answer}
              </span>
              {currentQuestion?.explanation && (
                <p className="text-xs text-zinc-400 mt-1 italic">{currentQuestion.explanation}</p>
              )}
            </div>
          )}
        </Card>
      </main>

      {/* 4 Contestants Flip Answer Cards */}
      <footer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {matchState.players.map((player) => {
          const resp = matchState.current_responses[player.slot_number];
          const isRevealed = matchState.is_revealed;
          const isCorrect = resp?.is_correct === true;
          const isWrong = resp?.is_correct === false;

          return (
            <Card
              key={player.slot_number}
              className={`border-zinc-800 bg-zinc-900/60 transition-all ${
                isRevealed && isCorrect
                  ? "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/40"
                  : isRevealed && isWrong
                  ? "border-red-500/50 bg-red-950/20"
                  : ""
              }`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 line-clamp-1">
                    {player.slot_number}. {player.name}
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {player.score} đ
                  </span>
                </div>

                <div className="h-14 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center px-3 text-center">
                  {!isRevealed ? (
                    resp ? (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-900 text-xs">
                        ĐÃ NỘP ({(resp.response_time_ms / 1000).toFixed(2)}s)
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-600 italic">Đang chờ nộp...</span>
                    )
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-black uppercase text-zinc-100 line-clamp-1">
                        {resp ? resp.answer_text : "(Không nộp)"}
                      </span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                      {isWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-1" />}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </footer>
    </div>
  );
}
