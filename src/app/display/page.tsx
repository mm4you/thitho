"use client";

import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sounds";
import { subscribeToGameChannel, loadSavedMatchState } from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { Volume2, VolumeX, Maximize, Trophy, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DisplayPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
        setTimeLeft(event.state.time_left);
        setTimerRunning(event.state.is_timer_running);
      } else if (event.type === "START_TIMER") {
        setTimeLeft(event.time_limit);
        setTimerRunning(true);
        if (soundEnabled) sound.playTick();
      } else if (event.type === "PAUSE_TIMER") {
        setTimerRunning(false);
      } else if (event.type === "LOCK_ANSWERS") {
        setTimerRunning(false);
        setMatchState((prev) => ({ ...prev, is_locked: true }));
        if (soundEnabled) sound.playTimeUp();
      } else if (event.type === "REVEAL_ANSWERS") {
        setMatchState((prev) => ({ ...prev, is_revealed: true }));
        if (soundEnabled) sound.playReveal();
      } else if (event.type === "SUBMIT_ANSWER") {
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
            if (soundEnabled) sound.playBuzzer();
            return {
              ...prev,
              buzzer_winner_slot: event.slot_number,
              buzzer_winner_time_ms: event.press_time_ms,
            };
          }
          return prev;
        });
      } else if (event.type === "RESET_BUZZER") {
        setMatchState((prev) => ({
          ...prev,
          buzzer_winner_slot: null,
          buzzer_winner_time_ms: null,
        }));
      } else if (event.type === "GRADE_ANSWERS") {
        if (soundEnabled) sound.playCorrect();
        setMatchState((prev) => {
          const updatedPlayers = prev.players.map((p) => {
            const res = event.results[p.slot_number];
            if (res) {
              return { ...p, score: p.score + res.points_awarded };
            }
            return p;
          });

          const updatedResponses = { ...prev.current_responses };
          Object.keys(event.results).forEach((k) => {
            const slot = Number(k);
            if (updatedResponses[slot]) {
              updatedResponses[slot].is_correct = event.results[slot].is_correct;
              updatedResponses[slot].points_awarded = event.results[slot].points_awarded;
            }
          });

          return {
            ...prev,
            is_scored: true,
            players: updatedPlayers,
            current_responses: updatedResponses,
          };
        });
      } else if (event.type === "PLAY_SFX") {
        if (soundEnabled) {
          if (event.sfx === "correct") sound.playCorrect();
          if (event.sfx === "wrong") sound.playWrong();
          if (event.sfx === "buzzer") sound.playBuzzer();
          if (event.sfx === "tick") sound.playTick();
          if (event.sfx === "timeup") sound.playTimeUp();
          if (event.sfx === "reveal") sound.playReveal();
          if (event.sfx === "victory") {
            sound.playVictory();
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          }
        }
      } else if (event.type === "OVERRIDE_SCORE") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number ? { ...p, score: p.score + event.delta } : p
          ),
        }));
      } else if (event.type === "CHANGE_QUESTION") {
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
  }, [soundEnabled]);

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (soundEnabled) sound.playTimeUp();
            return 0;
          }
          if (soundEnabled && prev <= 5) sound.playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timeLeft, soundEnabled]);

  const currentRound = matchState.rounds[matchState.current_round_index] || matchState.rounds[0];
  const currentQuestion = currentRound?.questions[matchState.current_question_index] || currentRound?.questions[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 select-none relative overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              {matchState.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">{currentRound?.title}</span>
              <span>•</span>
              <span>Câu hỏi {matchState.current_question_index + 1}/{currentRound?.questions.length || 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Center Main Arena */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center max-w-5xl w-full mx-auto gap-6">
        {/* Buzzer Alert */}
        {matchState.buzzer_winner_slot && (
          <div className="w-full bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-center animate-bounce">
            <span className="text-xl font-bold text-amber-400 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" />
              Thí sinh {matchState.buzzer_winner_slot} (
              {matchState.players.find((p) => p.slot_number === matchState.buzzer_winner_slot)?.name}) Đã Giành Quyền Trả Lời!
            </span>
          </div>
        )}

        {/* Question Card */}
        <Card className="w-full border-zinc-800 bg-zinc-900/60 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
          {/* Radial Timer */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            <svg className="w-28 h-28 md:w-32 md:h-32 transform -rotate-90">
              <circle cx="50%" cy="50%" r="42%" className="stroke-zinc-800 fill-none" strokeWidth="8" />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                className={`fill-none transition-all duration-1000 ${
                  timeLeft <= 5 ? "stroke-red-500" : "stroke-zinc-100"
                }`}
                strokeWidth="8"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * timeLeft) / (currentQuestion?.time_limit || 15)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl md:text-4xl font-bold font-mono ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-zinc-100"}`}>
                {timeLeft}
              </span>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">GIÂY</span>
            </div>
          </div>

          {/* Question Text */}
          <div className="flex-1 space-y-4">
            <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-400 font-mono text-xs">
              +{currentQuestion?.points_correct} ĐIỂM
            </Badge>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-100 leading-snug tracking-tight">
              {currentQuestion?.question_text}
            </h2>

            {/* Multiple Choice Options */}
            {currentQuestion?.question_type === "multiple_choice" && currentQuestion.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt, i) => {
                  const isCorrect = matchState.is_revealed && opt.startsWith(currentQuestion.correct_answer[0]);
                  return (
                    <div
                      key={i}
                      className={`p-3.5 rounded-lg text-sm font-medium border transition-all ${
                        isCorrect
                          ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300"
                      }`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Non Multiple Choice Answer Reveal */}
            {matchState.is_revealed && currentQuestion?.question_type !== "multiple_choice" && (
              <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase">ĐÁP ÁN:</span>
                <span className="text-sm font-bold text-zinc-100">{currentQuestion?.correct_answer}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 4 Contestants Flip Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            const hasSubmitted = !!resp;
            const isRevealed = matchState.is_revealed;
            const isScored = matchState.is_scored;
            const isCorrect = resp?.is_correct;

            return (
              <Card
                key={player.slot_number}
                className={`border-zinc-800 bg-zinc-900/40 transition-all ${
                  isScored && resp
                    ? isCorrect
                      ? "border-emerald-500/80 bg-emerald-950/20"
                      : "border-red-500/80 bg-red-950/20"
                    : matchState.buzzer_winner_slot === player.slot_number
                    ? "border-amber-400 bg-amber-950/20"
                    : hasSubmitted
                    ? "border-zinc-700 bg-zinc-900/80"
                    : ""
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-300 text-xs">
                      {player.slot_number}
                    </Badge>
                    {resp && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {(resp.response_time_ms / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold text-zinc-200 line-clamp-1 pt-1">
                    {player.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <div className="h-16 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2 text-center relative overflow-hidden">
                    {!hasSubmitted ? (
                      <span className="text-xs text-zinc-600 italic">Đang suy nghĩ...</span>
                    ) : !isRevealed ? (
                      <span className="text-xs font-semibold text-zinc-400">ĐÃ GỬI (ĐÃ KHÓA)</span>
                    ) : (
                      <span className="text-base font-bold text-zinc-100 uppercase line-clamp-2">
                        {resp.answer_text}
                      </span>
                    )}

                    {isScored && resp && (
                      <div className="absolute top-1.5 right-1.5">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-zinc-800/60">
                    <span className="text-zinc-500">Tổng điểm:</span>
                    <span className="font-mono font-bold text-sm text-amber-400">{player.score} đ</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Bottom Scoreboard */}
      <footer className="relative z-10 border-t border-zinc-800 pt-4">
        <div className="grid grid-cols-4 gap-4 max-w-5xl mx-auto">
          {matchState.players.map((p, idx) => (
            <div
              key={p.slot_number}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                <span className="text-xs font-medium text-zinc-300 line-clamp-1">{p.name}</span>
              </div>
              <span className="font-mono text-base font-bold text-amber-400">{p.score}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}