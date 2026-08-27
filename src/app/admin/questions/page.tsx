"use client";

import { useState, useRef } from "react";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent, syncMatchStateToCloud } from "@/lib/supabase";
import { MatchState, Round, Question } from "@/types/game";
import { parseRawTextQuestions } from "@/lib/importQuestions";
import {
  HelpCircle,
  Plus,
  Trash2,
  Clock,
  Check,
  Upload,
  FileText,
  Download,
  X,
  FileDown,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuestionsManagePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [activeRoundIdx, setActiveRoundIdx] = useState<number>(0);
  const [savedAlert, setSavedAlert] = useState<boolean>(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentRound = matchState.rounds[activeRoundIdx] || matchState.rounds[0];

  const handleUpdateRoundTime = (seconds: number) => {
    const sec = Math.max(1, Math.min(300, seconds || 15));
    const updatedRounds = matchState.rounds.map((r, idx) => {
      if (idx === activeRoundIdx) {
        return {
          ...r,
          questions: r.questions.map((q) => ({ ...q, time_limit: sec })),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  const handleUpdateQuestion = (qIdx: number, field: string, value: any) => {
    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === activeRoundIdx) {
        const updatedQuestions = r.questions.map((q, idx) => {
          if (idx === qIdx) {
            return { ...q, [field]: value };
          }
          return q;
        });
        return { ...r, questions: updatedQuestions };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
  };

  const handleAddQuestion = () => {
    const defaultTime = currentRound.questions[0]?.time_limit || 15;
    const newQuestion: Question = {
      id: "q_" + Date.now(),
      order_index: currentRound.questions.length,
      question_text: "Câu hỏi mới...",
      correct_answer: "Đáp án",
      points_correct: 10,
      points_wrong: 0,
      time_limit: defaultTime,
      question_type: currentRound.round_type === "khoi_dong" ? "multiple_choice" : "text_input",
    };

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === activeRoundIdx) {
        return { ...r, questions: [...r.questions, newQuestion] };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
  };

  const handleDeleteQuestion = (qIdx: number) => {
    if (currentRound.questions.length <= 1) {
      alert("Mỗi vòng thi cần có ít nhất 1 câu hỏi!");
      return;
    }

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === activeRoundIdx) {
        return { ...r, questions: r.questions.filter((_, idx) => idx !== qIdx) };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
  };

  const handleParseText = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setPreviewQuestions([]);
      setImportErrors([]);
      return;
    }
    const res = parseRawTextQuestions(text, defaultTimeForRound);
    setPreviewQuestions(res.questions);
    setImportErrors(res.errors);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseText(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDownloadSample = () => {
    const sampleText = `Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. Đà Nẵng
C. TP. Hồ Chí Minh
D. Hải Phòng
Đáp án: A
Thời gian: 15
Điểm: 10

Câu 2: Năm nào diễn ra Cách mạng Tháng Tám thành công?
Đáp án: 1945
Thời gian: 20
Điểm: 20

Sông nào dài nhất Việt Nam? | Sông Đồng Nai | 15 | 10`;

    const blob = new Blob([sampleText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "de_thi_mau_olymquiz.txt";
    link.click();
  };

  const handleExportFullExam = () => {
    const dataStr = JSON.stringify(matchState.rounds, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bo_de_olymquiz_${Date.now()}.json`;
    link.click();
  };

  const handleApplyImport = (mode: "replace" | "append") => {
    if (previewQuestions.length === 0) return;

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      if (rIdx === activeRoundIdx) {
        const newQuestions = mode === "replace"
          ? previewQuestions
          : [...r.questions, ...previewQuestions];
        return {
          ...r,
          questions: newQuestions.map((q, idx) => ({ ...q, order_index: idx })),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);

    setIsImportModalOpen(false);
    setImportText("");
    setPreviewQuestions([]);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  const defaultTimeForRound = currentRound?.questions[0]?.time_limit || 15;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans select-none">
      {/* MODAL IMPORT ĐỀ THI THÔNG MINH */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0d121f] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold uppercase text-white">
                  IMPORT ĐỀ THI CHO VÒNG: {currentRound.title}
                </h2>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#070a12] p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">
                Định dạng hỗ trợ: <strong>Câu 1:... A. B. C. D. Đáp án:...</strong> hoặc cú pháp <strong>Câu hỏi | Đáp án | Giây | Điểm</strong>
              </span>
              <button
                onClick={handleDownloadSample}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải File Mẫu
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  DÁN NỘI DUNG ĐỀ THI HOẶC CHỌN FILE TỪ MÁY:
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Tải Lên File (.txt, .csv, .json)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => handleParseText(e.target.value)}
                placeholder="Dán câu hỏi vào đây... Ví dụ:&#10;Câu 1: Thủ đô của Việt Nam là gì?&#10;A. Hà Nội&#10;B. Đà Nẵng&#10;Đáp án: A&#10;Thời gian: 15&#10;&#10;Câu 2: Năm diễn ra CMT8? | 1945 | 20 | 20"
                className="w-full bg-[#070a12] border border-slate-800 rounded-xl p-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />

              {previewQuestions.length > 0 && (
                <div className="bg-emerald-950/40 border border-emerald-500/60 p-3 rounded-xl">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                    <Check className="w-4 h-4" /> Đã nhận diện thành công {previewQuestions.length} câu hỏi:
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs text-slate-300 pr-1">
                    {previewQuestions.map((q, idx) => (
                      <div key={idx} className="bg-[#070a12] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="font-bold line-clamp-1 flex-1 mr-2">{idx + 1}. {q.question_text}</span>
                        <span className="text-emerald-400 font-mono font-bold shrink-0">{q.correct_answer} ({q.time_limit}s)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={() => setIsImportModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Hủy
              </Button>
              <Button
                disabled={previewQuestions.length === 0}
                onClick={() => handleApplyImport("append")}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-4 rounded-xl cursor-pointer"
              >
                + Thêm Vào Cuối ({previewQuestions.length} Câu)
              </Button>
              <Button
                disabled={previewQuestions.length === 0}
                onClick={() => handleApplyImport("replace")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow"
              >
                Thay Thế Toàn Bộ ({previewQuestions.length} Câu)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tiêu đề */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            NGÂN HÀNG CÂU HỎI & CẤU HÌNH ĐỀ THI
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Tự động đồng bộ lên Cloud Database • Cho phép import và xuất file đề thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportFullExam}
            className="border-slate-700 text-slate-300 hover:text-white text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
            title="Tải toàn bộ bộ đề hiện tại về máy tính dưới dạng file JSON"
          >
            <FileDown className="w-4 h-4 text-amber-400" /> Xuất File Đề Thi
          </Button>

          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 gap-1.5 rounded-xl cursor-pointer shadow"
          >
            <Upload className="w-4 h-4" /> Import Đề Thi / Dán Nhanh
          </Button>

          {savedAlert && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/60 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Đã đồng bộ Cloud thành công!
            </span>
          )}
        </div>
      </div>

      {/* 4 Tabs Vòng Thi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#0d121f] p-1.5 rounded-2xl border border-slate-800">
        {matchState.rounds.map((round, idx) => (
          <button
            key={round.id}
            onClick={() => setActiveRoundIdx(idx)}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeRoundIdx === idx
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <div className="uppercase line-clamp-1">{round.title}</div>
            <div className="text-[10px] opacity-80 font-normal mt-0.5">
              {round.questions.length} câu • {round.questions[0]?.time_limit || 15}s
            </div>
          </button>
        ))}
      </div>

      {/* CẤU HÌNH THỜI GIAN CHUẨN CHO VÒNG THI NÀY */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-sm font-bold text-white uppercase block">
              THỜI GIAN ĐẾM NGƯỢC CỦA VÒNG: {currentRound.title}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Bạn có thể gõ trực tiếp số giây hoặc chọn nhanh mốc bên dưới
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase">NHẬP GIÂY:</span>
          <input
            type="number"
            min={1}
            max={300}
            defaultValue={defaultTimeForRound}
            key={currentRound.id + defaultTimeForRound}
            onBlur={(e) => handleUpdateRoundTime(Number(e.target.value))}
            className="w-16 h-9 rounded-lg bg-[#070a12] border border-slate-700 px-2 text-center font-mono font-bold text-sm text-amber-400 focus:outline-none focus:border-amber-500"
          />
          <span className="text-xs text-slate-400 font-mono">giây/câu</span>

          <div className="flex gap-1 ml-2">
            {[10, 15, 20, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => handleUpdateRoundTime(sec)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  defaultTimeForRound === sec
                    ? "bg-amber-500 text-black"
                    : "bg-[#070a12] border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Danh Sách Câu Hỏi Trong Vòng */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-white">
            DANH SÁCH CÂU HỎI ({currentRound.questions.length} CÂU)
          </h2>

          <Button
            size="sm"
            onClick={handleAddQuestion}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 gap-1.5 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Câu Hỏi Mới
          </Button>
        </div>

        <div className="space-y-3">
          {currentRound.questions.map((q, qIdx) => (
            <div
              key={q.id || qIdx}
              className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-sm text-amber-400 uppercase">
                  CÂU HỎI {qIdx + 1}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Thời gian:</span>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={q.time_limit || 15}
                      onChange={(e) => handleUpdateQuestion(qIdx, "time_limit", Number(e.target.value))}
                      className="w-14 h-7 rounded bg-[#070a12] border border-slate-700 px-1 text-center font-mono text-xs font-bold text-white"
                    />
                    <span className="text-xs text-slate-400 font-mono">s</span>
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 cursor-pointer"
                    title="Xóa câu này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  NỘI DUNG CÂU HỎI:
                </label>
                <textarea
                  rows={2}
                  value={q.question_text}
                  onChange={(e) => handleUpdateQuestion(qIdx, "question_text", e.target.value)}
                  className="w-full bg-[#070a12] border border-slate-800 rounded-xl p-3 text-sm text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 uppercase block mb-1">
                    ĐÁP ÁN ĐÚNG CHUẨN:
                  </label>
                  <input
                    type="text"
                    value={q.correct_answer}
                    onChange={(e) => handleUpdateQuestion(qIdx, "correct_answer", e.target.value)}
                    className="w-full bg-[#070a12] border border-emerald-500/50 rounded-xl px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      ĐIỂM CỘNG (+):
                    </label>
                    <input
                      type="number"
                      value={q.points_correct}
                      onChange={(e) => handleUpdateQuestion(qIdx, "points_correct", Number(e.target.value))}
                      className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      ĐIỂM TRỪ (-):
                    </label>
                    <input
                      type="number"
                      value={q.points_wrong}
                      onChange={(e) => handleUpdateQuestion(qIdx, "points_wrong", Number(e.target.value))}
                      className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}