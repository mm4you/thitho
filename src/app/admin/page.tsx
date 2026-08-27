"use client";

import { useState, useEffect } from "react";`nimport { useRouter } from "next/navigation";`nimport { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState, Round, Question, QuestionType } from "@/types/game";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Users,
  Settings2,
  Play,
  Clock,
  HelpCircle,
  Upload,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_auth_token");
      if (!token) {
        router.push("/login?redirect=/admin");
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_auth_token");
      router.push("/login");
    }
  };
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"rounds" | "players" | "bulk">("rounds");
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
  const [bulkText, setBulkText] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const handleSave = () => {
    saveMatchStateLocally(matchState);
    sendGameEvent({ type: "SYNC_STATE", state: matchState });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetScores = () => {
    if (confirm("Bạn có chắc muốn đặt lại điểm 4 thí sinh về 0?")) {
      const updated = {
        ...matchState,
        players: matchState.players.map((p) => ({ ...p, score: 0 })),
        current_responses: {},
        is_locked: false,
        is_revealed: false,
        is_scored: false,
        buzzer_winner_slot: null,
      };
      setMatchState(updated);
      saveMatchStateLocally(updated);
      sendGameEvent({ type: "SYNC_STATE", state: updated });
    }
  };

  const currentRound = matchState.rounds[selectedRoundIdx] || matchState.rounds[0];

  const updateCurrentRound = (fields: Partial<Round>) => {
    const updatedRounds = [...matchState.rounds];
    updatedRounds[selectedRoundIdx] = { ...updatedRounds[selectedRoundIdx], ...fields };
    setMatchState({ ...matchState, rounds: updatedRounds });
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      order_index: currentRound.questions.length,
      question_text: "Nhập nội dung câu hỏi mới tại đây...",
      question_type: "multiple_choice",
      options: ["A. Lựa chọn A", "B. Lựa chọn B", "C. Lựa chọn C", "D. Lựa chọn D"],
      correct_answer: "A. Lựa chọn A",
      time_limit: currentRound.questions[0]?.time_limit || 15,
      points_correct: currentRound.questions[0]?.points_correct || 10,
      points_wrong: currentRound.questions[0]?.points_wrong || 0,
    };

    const updatedQuestions = [...currentRound.questions, newQ];
    updateCurrentRound({ questions: updatedQuestions });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (currentRound.questions.length <= 1) {
      alert("Mỗi vòng cần có ít nhất 1 câu hỏi!");
      return;
    }
    const updatedQuestions = currentRound.questions.filter((_, i) => i !== qIndex);
    updateCurrentRound({ questions: updatedQuestions });
  };

  const updateQuestion = (qIndex: number, fields: Partial<Question>) => {
    const updatedQuestions = [...currentRound.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], ...fields };
    updateCurrentRound({ questions: updatedQuestions });
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      setBulkStatus("Vui lòng dán nội dung câu hỏi trước!");
      return;
    }

    try {
      const blocks = bulkText.split(/\n\s*\n/);
      const parsedQuestions: Question[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        let qText = lines[0].replace(/^(câu\s*\d+[:.]?|question\s*\d+[:.]?)\s*/i, "");
        const options: string[] = [];
        let correctAns = "";
        let timeLimit = 15;
        let points = 10;

        lines.slice(1).forEach((line) => {
          if (/^[A-D][.:]\s*/i.test(line)) {
            options.push(line);
          } else if (/^(đáp án|answer|da)[:]\s*/i.test(line)) {
            correctAns = line.replace(/^(đáp án|answer|da)[:]\s*/i, "");
          } else if (/^(thời gian|time)[:]\s*/i.test(line)) {
            const t = parseInt(line.replace(/^(thời gian|time)[:]\s*/i, ""));
            if (!isNaN(t)) timeLimit = t;
          } else if (/^(điểm|point|points)[:]\s*/i.test(line)) {
            const p = parseInt(line.replace(/^(điểm|point|points)[:]\s*/i, ""));
            if (!isNaN(p)) points = p;
          }
        });

        if (options.length === 0 && !correctAns && lines.length >= 2) {
          correctAns = lines[1];
        }

        parsedQuestions.push({
          id: `q_bulk_${Date.now()}_${idx}`,
          order_index: idx,
          question_text: qText,
          question_type: options.length >= 2 ? "multiple_choice" : "text_input",
          options: options.length >= 2 ? options : undefined,
          correct_answer: correctAns || options[0] || "Đang cập nhật",
          time_limit: timeLimit,
          points_correct: points,
          points_wrong: 0,
        });
      });

      if (parsedQuestions.length > 0) {
        updateCurrentRound({ questions: parsedQuestions });
        setBulkStatus(`✅ Đã nạp thành công ${parsedQuestions.length} câu hỏi vào ${currentRound.title}!`);
        setTimeout(() => setActiveTab("rounds"), 1200);
      } else {
        setBulkStatus("❌ Không tìm thấy câu hỏi hợp lệ.");
      }
    } catch {
      setBulkStatus("❌ Lỗi phân tích cú pháp.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans max-w-5xl mx-auto">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="border-zinc-800 hover:bg-zinc-800 text-zinc-300">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Quản Trị Đề Thi & Cấu Hình Vòng
            </h1>
            <p className="text-xs text-zinc-400">Soạn câu hỏi, điều chỉnh thời gian và chế độ chơi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetScores}
            className="border-zinc-800 text-zinc-400 hover:text-red-400 text-xs"
          >
            Reset Điểm
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> {savedSuccess ? "Đã Lưu!" : "Lưu Thay Đổi"}
          </Button>
          <Link href="/admin/live">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current" /> Bảng MC
            </Button>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800/80 pb-3">
        <Button
          variant={activeTab === "rounds" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("rounds")}
          className="text-xs gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" /> Soạn Đề Thủ Công
        </Button>
        <Button
          variant={activeTab === "bulk" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("bulk")}
          className="text-xs gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Nạp Nhanh Hàng Loạt
        </Button>
        <Button
          variant={activeTab === "players" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("players")}
          className="text-xs gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Danh Sách Thí Sinh
        </Button>
      </div>

      {activeTab === "bulk" ? (
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="text-base">Nạp Nhanh Câu Hỏi: {currentRound.title}</CardTitle>
            <CardDescription className="text-xs">
              Dán danh sách câu hỏi dạng văn bản vào ô dưới đây:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. TP. Hồ Chí Minh
C. Đà Nẵng
D. Huế
Đáp án: A. Hà Nội
Thời gian: 15`}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            {bulkStatus && (
              <div className="text-xs font-semibold text-amber-400 bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                {bulkStatus}
              </div>
            )}
            <Button onClick={handleBulkImport} className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs">
              Bắt Đầu Phân Tích & Nạp Đề
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === "players" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchState.players.map((p, idx) => (
            <Card key={p.slot_number} className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-zinc-800 text-xs">Vị trí {p.slot_number}</Badge>
                  <span className="text-xs font-mono text-zinc-400">PIN: {p.slot_number}{p.slot_number}{p.slot_number}{p.slot_number}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Họ tên:</label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const newPlayers = [...matchState.players];
                      newPlayers[idx].name = e.target.value;
                      setMatchState({ ...matchState, players: newPlayers });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Trường:</label>
                  <input
                    type="text"
                    value={p.school_name}
                    onChange={(e) => {
                      const newPlayers = [...matchState.players];
                      newPlayers[idx].school_name = e.target.value;
                      setMatchState({ ...matchState, players: newPlayers });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">
              Vòng Thi: {currentRound.title} ({currentRound.questions.length} câu hỏi)
            </h3>
            <Button size="sm" onClick={handleAddQuestion} className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-semibold gap-1">
              <Plus className="w-3.5 h-3.5" /> Thêm Câu Hỏi
            </Button>
          </div>

          <div className="space-y-4">
            {currentRound.questions.map((q, qIdx) => (
              <Card key={q.id} className="border-zinc-800 bg-zinc-900/40">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <Badge variant="outline" className="border-zinc-800 text-[10px]">CÂU {qIdx + 1}</Badge>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={q.question_type}
                        onChange={(e) => updateQuestion(qIdx, { question_type: e.target.value as QuestionType })}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-medium text-zinc-200"
                      >
                        <option value="multiple_choice">Trắc Nghiệm</option>
                        <option value="text_input">Tự Luận / Tăng Tốc</option>
                        <option value="buzzer">Bấm Chuông</option>
                      </select>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <input
                          type="number"
                          value={q.time_limit}
                          onChange={(e) => updateQuestion(qIdx, { time_limit: Number(e.target.value) })}
                          className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center font-mono"
                        />
                        <span>s</span>
                      </div>
                      {currentRound.questions.length > 1 && (
                        <button
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs font-medium text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />

                  {q.question_type === "multiple_choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((optIdx) => (
                        <input
                          key={optIdx}
                          type="text"
                          value={q.options?.[optIdx] || ""}
                          onChange={(e) => {
                            const newOpts = [...(q.options || ["A. ", "B. ", "C. ", "D. "])];
                            newOpts[optIdx] = e.target.value;
                            updateQuestion(qIdx, { options: newOpts });
                          }}
                          className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200"
                        />
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-emerald-400 block mb-1">Đáp Án Đúng:</label>
                      <input
                        type="text"
                        value={q.correct_answer}
                        onChange={(e) => updateQuestion(qIdx, { correct_answer: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">Giải thích:</label>
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}