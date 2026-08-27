"use client";

import { useState } from "react";
import Link from "next/link";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent } from "@/lib/supabase";
import { MatchState, Round, Question, QuestionType, RoundType } from "@/types/game";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Users,
  Settings2,
  Play,
  Clock,
  Award,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"rounds" | "players">("rounds");
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);

  // Lưu cấu hình
  const handleSave = () => {
    saveMatchStateLocally(matchState);
    sendGameEvent({ type: "SYNC_STATE", state: matchState });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Reset Điểm
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

  // Thêm Vòng Thi Mới
  const handleAddRound = () => {
    const newRoundIndex = matchState.rounds.length;
    const newRound: Round = {
      id: `round_${Date.now()}`,
      title: `VÒNG ${newRoundIndex + 1}: VÒNG MỚI`,
      round_type: "custom",
      order_index: newRoundIndex,
      description: "Tùy chỉnh thể lệ và thời gian theo yêu cầu",
      questions: [
        {
          id: `q_${Date.now()}_1`,
          order_index: 0,
          question_text: "Nội dung câu hỏi số 1...",
          question_type: "multiple_choice",
          options: ["A. Phương án 1", "B. Phương án 2", "C. Phương án 3", "D. Phương án 4"],
          correct_answer: "A. Phương án 1",
          time_limit: 15,
          points_correct: 10,
          points_wrong: 0,
        },
      ],
    };

    const updatedRounds = [...matchState.rounds, newRound];
    setMatchState({ ...matchState, rounds: updatedRounds });
    setSelectedRoundIdx(updatedRounds.length - 1);
  };

  // Xóa Vòng Thi
  const handleDeleteRound = (index: number) => {
    if (matchState.rounds.length <= 1) {
      alert("Cần giữ lại ít nhất 1 vòng thi!");
      return;
    }
    if (confirm("Bạn có chắc muốn xóa vòng thi này?")) {
      const updatedRounds = matchState.rounds.filter((_, i) => i !== index);
      setMatchState({ ...matchState, rounds: updatedRounds });
      setSelectedRoundIdx(Math.max(0, index - 1));
    }
  };

  // Cập nhật thông tin vòng hiện tại
  const currentRound = matchState.rounds[selectedRoundIdx] || matchState.rounds[0];

  const updateCurrentRound = (fields: Partial<Round>) => {
    const updatedRounds = [...matchState.rounds];
    updatedRounds[selectedRoundIdx] = { ...updatedRounds[selectedRoundIdx], ...fields };
    setMatchState({ ...matchState, rounds: updatedRounds });
  };

  // Thêm Câu Hỏi Mới vào Vòng Hiện Tại
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

  // Xóa Câu Hỏi
  const handleDeleteQuestion = (qIndex: number) => {
    if (currentRound.questions.length <= 1) {
      alert("Mỗi vòng cần có ít nhất 1 câu hỏi!");
      return;
    }
    const updatedQuestions = currentRound.questions.filter((_, i) => i !== qIndex);
    updateCurrentRound({ questions: updatedQuestions });
  };

  // Sửa Câu Hỏi
  const updateQuestion = (qIndex: number, fields: Partial<Question>) => {
    const updatedQuestions = [...currentRound.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], ...fields };
    updateCurrentRound({ questions: updatedQuestions });
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 p-4 md:p-8 font-sans max-w-6xl mx-auto">
      {/* TOP HEADER */}
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
              CẤU HÌNH TRẬN ĐẤU & CHẾ ĐỘ CHƠI
            </h1>
            <p className="text-xs text-slate-400">
              Thiết lập thời gian, điểm số, chế độ chơi (Trắc nghiệm, Tăng tốc, Bấm chuông) cho từng vòng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetScores}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-600/30"
          >
            Reset Điểm Về 0
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" /> {savedSuccess ? "ĐÃ LƯU!" : "LƯU CẤU HÌNH"}
          </button>
          <Link
            href="/admin/live"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" /> VÀO BẢNG ĐIỀU KHIỂN MC
          </Link>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab("rounds")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === "rounds"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Cấu Hình Vòng Thi & Câu Hỏi
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === "players"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Cấu Hình 4 Thí Sinh
        </button>
      </div>

      {activeTab === "players" ? (
        /* TAB 1: CẤU HÌNH 4 THÍ SINH */
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Thông Tin 4 Thí Sinh Thi Đấu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchState.players.map((p, idx) => (
              <div key={p.slot_number} className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase">Thí sinh Vị trí {p.slot_number}</span>
                  <span className="text-xs font-mono font-bold text-amber-400">Điểm hiện tại: {p.score}đ</span>
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
                    <label className="text-[11px] text-slate-400 block mb-1">Trường / Đơn vị đại diện:</label>
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
        /* TAB 2: CẤU HÌNH VÒNG THI & CHẾ ĐỘ CHƠI */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* CỘT TRÁI: DANH SÁCH CÁC VÒNG THI */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Các Vòng Thi</span>
                <button
                  onClick={handleAddRound}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 border border-blue-500/50 text-blue-300 text-xs font-bold hover:bg-blue-600/50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Vòng
                </button>
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

            {matchState.rounds.length > 1 && (
              <button
                onClick={() => handleDeleteRound(selectedRoundIdx)}
                className="mt-6 w-full py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa Vòng Này
              </button>
            )}
          </div>

          {/* CỘT PHẢI: CHI TIẾT CẤU HÌNH VÒNG & CÂU HỎI */}
          <div className="lg:col-span-3 space-y-6">
            {/* THIẾT LẬP VÒNG THI */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <h3 className="text-base font-bold text-amber-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Cài Đặt Vòng: {currentRound.title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Tên Hiển Thị Vòng:</label>
                  <input
                    type="text"
                    value={currentRound.title}
                    onChange={(e) => updateCurrentRound({ title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Mô Tả / Thể Lệ Vòng:</label>
                  <input
                    type="text"
                    value={currentRound.description || ""}
                    onChange={(e) => updateCurrentRound({ description: e.target.value })}
                    placeholder="Mô tả thể lệ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÂU HỎI TRONG VÒNG */}
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
                    {/* Header Câu Hỏi & Setting Thời Gian / Điểm */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <span className="text-xs font-black text-blue-400 uppercase">CÂU HỎI {qIdx + 1}</span>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {/* Chế độ chơi */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">Chế độ:</span>
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
                        </div>

                        {/* Thời gian */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Thời gian:</span>
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={q.time_limit}
                            onChange={(e) => updateQuestion(qIdx, { time_limit: Number(e.target.value) })}
                            className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-bold text-white"
                          />
                          <span className="text-slate-500">giây</span>
                        </div>

                        {/* Điểm đúng */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-medium">+Đúng:</span>
                          <input
                            type="number"
                            value={q.points_correct}
                            onChange={(e) => updateQuestion(qIdx, { points_correct: Number(e.target.value) })}
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-bold text-emerald-300"
                          />
                          <span className="text-slate-500">đ</span>
                        </div>

                        {/* Điểm trừ */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-400 font-medium">-Sai:</span>
                          <input
                            type="number"
                            value={q.points_wrong}
                            onChange={(e) => updateQuestion(qIdx, { points_wrong: Number(e.target.value) })}
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-bold text-rose-300"
                          />
                          <span className="text-slate-500">đ</span>
                        </div>

                        {/* Nút Xóa câu */}
                        {currentRound.questions.length > 1 && (
                          <button
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Nội dung câu hỏi:</label>
                      <textarea
                        rows={2}
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                        placeholder="Nhập câu hỏi..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Tùy chọn nếu là Trắc Nghiệm */}
                    {q.question_type === "multiple_choice" && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">4 Phương Án A, B, C, D:</label>
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
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Đáp án chuẩn */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                          Đáp Án Đúng Chuẩn (Hệ Thống Tự So Sánh):
                        </label>
                        <input
                          type="text"
                          value={q.correct_answer}
                          onChange={(e) => updateQuestion(qIdx, { correct_answer: e.target.value })}
                          placeholder="Ví dụ: C. Quân Minh hoặc HOA SEN"
                          className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Giải Thích (MC đọc khi công bố):</label>
                        <input
                          type="text"
                          value={q.explanation || ""}
                          onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                          placeholder="Giải thích thêm..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
