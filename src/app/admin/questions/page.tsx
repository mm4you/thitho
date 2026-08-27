"use client";

import { useState } from "react";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState, Round, Question, QuestionType } from "@/types/game";
import {
  Save,
  Plus,
  Trash2,
  HelpCircle,
  Upload,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminQuestionsPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"edit" | "bulk">("edit");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bulkText, setBulkText] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const currentRound = matchState.rounds[selectedRoundIdx] || matchState.rounds[0];

  const handleSave = () => {
    saveMatchStateLocally(matchState);
    sendGameEvent({ type: "SYNC_STATE", state: matchState });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

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
        setTimeout(() => setActiveTab("edit"), 1200);
      } else {
        setBulkStatus("❌ Không tìm thấy câu hỏi hợp lệ.");
      }
    } catch {
      setBulkStatus("❌ Lỗi phân tích cú pháp.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-blue-400" />
            Ngân Hàng Câu Hỏi & Vòng Thi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Soạn câu hỏi, điều chỉnh thời gian đếm ngược và điểm số cho 4 vòng thi
          </p>
        </div>

        <Button
          onClick={handleSave}
          className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs gap-1.5"
        >
          <Save className="w-3.5 h-3.5" /> {savedSuccess ? "Đã Lưu!" : "Lưu Vào Hệ Thống"}
        </Button>
      </div>

      {/* Chọn Vòng Thi & Chế Độ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">Chọn Vòng:</span>
          <div className="flex gap-1.5">
            {matchState.rounds.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  selectedRoundIdx === idx
                    ? "bg-zinc-100 border-zinc-100 text-zinc-950 shadow"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-3 py-1 rounded text-xs font-semibold ${
              activeTab === "edit" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Chỉnh Sửa
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
              activeTab === "bulk" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Upload className="w-3 h-3" /> Nạp Nhanh
          </button>
        </div>
      </div>

      {activeTab === "bulk" ? (
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="text-base">Nạp Nhanh Hàng Loạt Vào: {currentRound.title}</CardTitle>
            <CardDescription className="text-xs">
              Dán danh sách câu hỏi dạng văn bản vào khung bên dưới:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              rows={12}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Câu 1: Đỉnh núi nào cao nhất Việt Nam?
A. Fansipan
B. Pu Si Lung
C. Pu Ta Leng
D. Bạch Mộc Lương Tử
Đáp án: A. Fansipan
Thời gian: 15
Điểm: 10`}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            {bulkStatus && (
              <div className="text-xs font-semibold text-amber-400 bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                {bulkStatus}
              </div>
            )}
            <Button onClick={handleBulkImport} className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs h-10">
              Bắt Đầu Phân Tích & Nạp Đề Tự Động
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Danh Sách {currentRound.questions.length} Câu Hỏi Trong {currentRound.title}
            </span>
            <Button size="sm" onClick={handleAddQuestion} className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-bold gap-1">
              <Plus className="w-3.5 h-3.5" /> Thêm Câu Hỏi Mới
            </Button>
          </div>

          <div className="space-y-4">
            {currentRound.questions.map((q, qIdx) => (
              <Card key={q.id} className="border-zinc-800 bg-zinc-900/40">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-950 text-xs font-mono">
                      CÂU {qIdx + 1}
                    </Badge>

                    <div className="flex items-center gap-3 text-xs">
                      <select
                        value={q.question_type}
                        onChange={(e) => updateQuestion(qIdx, { question_type: e.target.value as QuestionType })}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-medium text-zinc-200"
                      >
                        <option value="multiple_choice">Trắc Nghiệm (A/B/C/D)</option>
                        <option value="text_input">Tự Luận / Tăng Tốc</option>
                        <option value="buzzer">Bấm Chuông Giành Quyền</option>
                      </select>

                      <div className="flex items-center gap-1.5 text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                        <Clock className="w-3.5 h-3.5" />
                        <input
                          type="number"
                          value={q.time_limit}
                          onChange={(e) => updateQuestion(qIdx, { time_limit: Number(e.target.value) })}
                          className="w-10 bg-transparent text-center font-mono font-bold text-zinc-100 focus:outline-none"
                        />
                        <span>giây</span>
                      </div>

                      {currentRound.questions.length > 1 && (
                        <button
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Nội dung câu hỏi:</label>
                    <textarea
                      rows={2}
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                  </div>

                  {q.question_type === "multiple_choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                          className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-bold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">Giải thích (Tùy chọn):</label>
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
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
