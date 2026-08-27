"use client";

import { useState } from "react";
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
  FileText,
  Upload,
} from "lucide-react";

export default function AdminSettingsPage() {
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

  // NẠP NHANH HÀNG LOẠT (BULK IMPORT PARSER)
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      setBulkStatus("Vui lòng dán nội dung danh sách câu hỏi trước!");
      return;
    }

    try {
      const blocks = bulkText.split(/\n\s*\n/); // Tách từng câu bằng dòng trống
      const parsedQuestions: Question[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        let qText = lines[0].replace(/^(câu\s*\d+[:.]?|question\s*\d+[:.]?)\s*/i, "");
        const options: string[] = [];
        let correctAns = "";
        let timeLimit = 15;
        let points = 10;
        let qType: QuestionType = "text_input";

        lines.slice(1).forEach((line) => {
          if (/^[A-D][.:]\s*/i.test(line)) {
            options.push(line);
            qType = "multiple_choice";
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
        setBulkStatus("❌ Không tìm thấy câu hỏi hợp lệ trong văn bản.");
      }
    } catch {
      setBulkStatus("❌ Có lỗi xảy ra khi phân tích cú pháp. Vui lòng kiểm tra lại!");
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 p-4 md:p-8 font-sans max-w-6xl mx-auto">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
              QUẢN TRỊ & SOẠN ĐỀ THI
            </h1>
            <p className="text-xs text-slate-400">
              Nạp câu hỏi nhanh • Cấu hình thời gian & thể lệ từng vòng • Đổi tên thí sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetScores}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-600/30"
          >
            Reset Điểm
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" /> {savedSuccess ? "ĐÃ LƯU!" : "LƯU ĐỀ THI"}
          </button>
          <Link
            href="/admin/live"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" /> BẢNG MC
          </Link>
        </div>
      </header>

      {/* TABS */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab("rounds")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === "rounds"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Soạn Đề Thủ Công
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === "bulk"
              ? "bg-amber-600 text-white shadow-lg"
              : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Upload className="w-4 h-4" />
          ⚡ Nạp Nhanh Hàng Loạt (Copy-Paste)
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === "players"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Tài Khoản 4 Thí Sinh
        </button>
      </div>

      {activeTab === "bulk" ? (
        /* TAB BULK IMPORT */
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/30">
          <h2 className="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Nạp Nhanh Hàng Loạt Câu Hỏi Cho: {currentRound.title}
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Bạn chỉ cần copy danh sách câu hỏi dạng văn bản bên dưới và dán vào đây. Hệ thống tự động nhận diện câu hỏi, các phương án A/B/C/D và đáp án!
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Dán nội dung câu hỏi tại đây:
              </label>
              <textarea
                rows={12}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Câu 1: Tác phẩm Bình Ngô đại cáo do ai sáng tác?
A. Nguyễn Trãi
B. Nguyễn Du
C. Lê Lợi
D. Trần Hưng Đạo
Đáp án: A. Nguyễn Trãi
Thời gian: 15

Câu 2: Đỉnh núi cao nhất Việt Nam là đỉnh nào?
Đáp án: Fansipan
Thời gian: 20`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase mb-2">Mẫu Định Dạng Hỗ Trợ:</h4>
                <div className="text-[11px] text-slate-300 space-y-2 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <p className="text-blue-300 font-bold"># Mẫu Trắc Nghiệm:</p>
                  <p>Câu 1: Nội dung câu hỏi...</p>
                  <p>A. Lựa chọn 1</p>
                  <p>B. Lựa chọn 2</p>
                  <p>C. Lựa chọn 3</p>
                  <p>D. Lựa chọn 4</p>
                  <p>Đáp án: A</p>
                  <p className="text-emerald-300 font-bold mt-2"># Mẫu Tự Luận / Tăng Tốc:</p>
                  <p>Câu 2: Hoa sen là quốc hoa nước nào?</p>
                  <p>Đáp án: Việt Nam</p>
                </div>
              </div>

              {bulkStatus && (
                <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold mt-3">
                  {bulkStatus}
                </div>
              )}

              <button
                onClick={handleBulkImport}
                className="w-full mt-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Upload className="w-4 h-4" /> BẮT ĐẦU PHÂN TÍCH & NẠP VÀO VÒNG NÀY
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "players" ? (
        /* TAB PLAYERS */
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Tài Khoản & Mã PIN 4 Thí Sinh
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchState.players.map((p, idx) => (
              <div key={p.slot_number} className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase">Thí sinh Vị trí {p.slot_number}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Mã PIN Đăng Nhập: {p.slot_number}{p.slot_number}{p.slot_number}{p.slot_number}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Họ và tên:</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const newPlayers = [...matchState.players];
                        newPlayers[idx].name = e.target.value;
                        setMatchState({ ...matchState, players: newPlayers });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Trường / Đơn vị:</label>
                    <input
                      type="text"
                      value={p.school_name}
                      onChange={(e) => {
                        const newPlayers = [...matchState.players];
                        newPlayers[idx].school_name = e.target.value;
                        setMatchState({ ...matchState, players: newPlayers });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB MANUAL ROUNDS & QUESTIONS */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vòng Thi</span>
              </div>
              <div className="space-y-2">
                {matchState.rounds.map((round, idx) => (
                  <button
                    key={round.id}
                    onClick={() => setSelectedRoundIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedRoundIdx === idx
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs uppercase">{round.title}</div>
                      <div className="text-[11px] opacity-75">{round.questions.length} câu hỏi</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  Danh Sách Câu Hỏi ({currentRound.questions.length} câu)
                </h3>
                <button
                  onClick={handleAddQuestion}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Thêm Câu Hỏi
                </button>
              </div>

              <div className="space-y-4">
                {currentRound.questions.map((q, qIdx) => (
                  <div key={q.id} className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <span className="text-xs font-black text-blue-400 uppercase">CÂU HỎI {qIdx + 1}</span>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <select
                          value={q.question_type}
                          onChange={(e) =>
                            updateQuestion(qIdx, { question_type: e.target.value as QuestionType })
                          }
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-semibold text-amber-300"
                        >
                          <option value="multiple_choice">Trắc Nghiệm (A, B, C, D)</option>
                          <option value="text_input">Nhập Chữ / Tăng Tốc</option>
                          <option value="buzzer">Bấm Chuông Giành Quyền</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="number"
                            value={q.time_limit}
                            onChange={(e) => updateQuestion(qIdx, { time_limit: Number(e.target.value) })}
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center font-bold"
                          />
                          <span className="text-slate-500">s</span>
                        </div>
                        {currentRound.questions.length > 1 && (
                          <button
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400"
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
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
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                          />
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-400 block mb-1">Đáp Án Đúng:</label>
                        <input
                          type="text"
                          value={q.correct_answer}
                          onChange={(e) => updateQuestion(qIdx, { correct_answer: e.target.value })}
                          className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-sm font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Giải Thích:</label>
                        <input
                          type="text"
                          value={q.explanation || ""}
                          onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
