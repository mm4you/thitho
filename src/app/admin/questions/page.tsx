"use client";

import { useState, useRef } from "react";
import { loadSavedMatchState, saveMatchStateLocally, sendGameEvent, syncMatchStateToCloud } from "@/lib/supabase";
import { MatchState, Round, Question } from "@/types/game";
import { parseRawTextQuestions, parseFullMatchExam, ParsedFullExamResult } from "@/lib/importQuestions";
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
  Layers,
  Sparkles,
  Tag,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuestionsManagePage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [activeRoundIdx, setActiveRoundIdx] = useState<number>(0);
  const [savedAlert, setSavedAlert] = useState<boolean>(false);

  // Modal Import 1 File Toan Bo 4 Vong Thi
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [fullExamResult, setFullExamResult] = useState<ParsedFullExamResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Round Info Modal
  const [isEditingRoundInfo, setIsEditingRoundInfo] = useState<boolean>(false);
  const [tempRoundTitle, setTempRoundTitle] = useState<string>("");
  const [tempRoundDesc, setTempRoundDesc] = useState<string>("");

  const currentRound = matchState.rounds[activeRoundIdx] || matchState.rounds[0];

  const handleOpenEditRound = () => {
    setTempRoundTitle(currentRound.title);
    setTempRoundDesc(currentRound.description || "");
    setIsEditingRoundInfo(true);
  };

  const handleSaveRoundInfo = () => {
    if (!tempRoundTitle.trim()) return;
    const updatedRounds = matchState.rounds.map((r, idx) => {
      if (idx === activeRoundIdx) {
        return {
          ...r,
          title: tempRoundTitle.trim(),
          description: tempRoundDesc.trim(),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    setIsEditingRoundInfo(false);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

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
      setFullExamResult(null);
      return;
    }
    const res = parseFullMatchExam(text);
    setFullExamResult(res);
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
    const sampleText = `====================================================================
OLYMQUIZ - FILE ĐỀ THI MẪU CHUẨN 4 VÒNG THI (OLYMPIA ARENA)
====================================================================

[VÒNG 1: KHỞI ĐỘNG]
Câu 1: Thủ đô của nước CHXHCN Việt Nam là thành phố nào?
A. Hà Nội
B. Đà Nẵng
C. TP. Hồ Chí Minh
D. Hải Phòng
Đáp án: A
Thời gian: 15
Điểm: 10

Câu 2: Kim loại nào có tính dẫn điện tốt nhất trong các kim loại sau?
A. Vàng
B. Bạc
C. Đồng
D. Nhôm
Đáp án: B
Thời gian: 15
Điểm: 10

[VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT]
Hàng ngang số 1: Quốc gia nào có diện tích lớn nhất thế giới? | NGA | 15 | 10
Hàng ngang số 2: Đại dương nào có diện tích lớn nhất hành tinh? | THÁI BÌNH DƯƠNG | 15 | 10
Từ khóa chướng ngại vật: ĐỊA LÝ VÀ VŨ TRỤ | ĐỊA LÝ VÀ VŨ TRỤ | 15 | 40

[VÒNG 3: TĂNG TỐC]
Câu 1: Sắp xếp các chữ cái sau thành từ có nghĩa: O L Y M P I A | OLYMPIA | 10 | 40
Câu 2: Hình ảnh gợi nhớ đến chiến dịch lịch sử lừng lẫy năm 1954? | ĐIỆN BIÊN PHỦ | 20 | 40
Câu 3: Tìm số tiếp theo trong dãy số: 2, 4, 8, 16, ... | 32 | 30 | 40
Câu 4: Tỉnh nào có diện tích tự nhiên lớn nhất Việt Nam hiện nay? | NGHỆ AN | 40 | 40

[VÒNG 4: VỀ ĐÍCH]
Câu 1: Nhà thơ nào trong văn học cổ điển được mệnh danh là Thi Tiên? | LÝ BẠCH | 20 | 20
Câu 2: Ai là người đầu tiên bay vào không gian vũ trụ vào năm 1961? | YURI GAGARIN | 30 | 30
Câu 3: Chiến thắng Bạch Đằng đánh tan quân Nam Hán năm 938 do ai chỉ huy? | NGÔ QUYỀN | 20 | 20`;

    const blob = new Blob([sampleText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "de_thi_mau_chuan_4_vong_olymquiz.txt";
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

  const handleApplyFullExam = () => {
    if (!fullExamResult || fullExamResult.rounds.length === 0) return;

    const updatedRounds = matchState.rounds.map((r, rIdx) => {
      const matchParsed = fullExamResult.rounds.find((p) => p.roundIndex === rIdx);
      if (matchParsed && matchParsed.questions.length > 0) {
        return {
          ...r,
          questions: matchParsed.questions.map((q, idx) => ({ ...q, order_index: idx })),
        };
      }
      return r;
    });

    const newState = { ...matchState, rounds: updatedRounds };
    setMatchState(newState);
    syncMatchStateToCloud(newState);

    setIsImportModalOpen(false);
    setImportText("");
    setFullExamResult(null);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const defaultTimeForRound = currentRound?.questions[0]?.time_limit || 15;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans select-none">
      {/* MODAL EDIT ROUND INFO & TOPIC */}
      {isEditingRoundInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d121f] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold uppercase text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                CHỈNH SỬA TÊN & CHỦ ĐỀ VÒNG THI
              </h2>
              <button onClick={() => setIsEditingRoundInfo(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  TÊN VÒNG THI:
                </label>
                <input
                  type="text"
                  value={tempRoundTitle}
                  onChange={(e) => setTempRoundTitle(e.target.value)}
                  placeholder="Ví dụ: Vòng 1: Khởi Động..."
                  className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  CHỦ ĐỀ / MÔ TẢ VÒNG THI:
                </label>
                <input
                  type="text"
                  value={tempRoundDesc}
                  onChange={(e) => setTempRoundDesc(e.target.value)}
                  placeholder="Ví dụ: Kiến thức tự nhiên & xã hội tổng hợp..."
                  className="w-full bg-[#070a12] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingRoundInfo(false)} className="text-xs text-slate-400">
                Hủy
              </Button>
              <Button size="sm" onClick={handleSaveRoundInfo} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-9 px-4 rounded-xl cursor-pointer">
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT 1 FILE CHO TOÀN BỘ 4 VÒNG THI */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0d121f] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold uppercase text-white">
                    IMPORT 1 FILE CHO TOÀN BỘ 4 VÒNG THI
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Tự động nhận diện và phân bổ câu hỏi vào 4 vòng trong 1 lần dán</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#070a12] p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-200 font-semibold block">
                  Đánh dấu vòng bằng: <strong>[VÒNG 1: KHỞI ĐỘNG]</strong>, <strong>[VÒNG 2: VCNV]</strong>, <strong>[VÒNG 3: TĂNG TỐC]</strong>, <strong>[VÒNG 4: VỀ ĐÍCH]</strong>
                </span>
                <div className="text-[11px] text-amber-300/90 font-medium pt-1">💡 Số lượng câu khuyến nghị: V1 (8-12 câu) • V2 (4 hàng ngang + 1 từ khóa) • V3 (4 câu tốc độ 10s, 20s, 30s, 40s) • V4 (8-12 câu chia cho 4 thí sinh)</div>
              </div>
              <button
                onClick={handleDownloadSample}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" /> Tải File Đề Mẫu 4 Vòng (.txt)
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  DÁN NỘI DUNG ĐỀ THI 4 VÒNG HOẶC TẢI LÊN FILE TỪ MÁY:
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Chọn File Từ Máy (.txt, .docx, .json)
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
                rows={8}
                value={importText}
                onChange={(e) => handleParseText(e.target.value)}
                placeholder="Dán toàn bộ đề thi vào đây...&#10;&#10;[VÒNG 1: KHỞI ĐỘNG]&#10;Câu 1: Thủ đô của Việt Nam là gì?&#10;A. Hà Nội&#10;B. Đà Nẵng&#10;Đáp án: A&#10;&#10;[VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT]&#10;Hàng ngang 1 | NGA | 15 | 10&#10;&#10;[VÒNG 3: TĂNG TỐC]&#10;Sắp xếp chữ cái | OLYMPIA | 10 | 40&#10;&#10;[VÒNG 4: VỀ ĐÍCH]&#10;Câu 20 điểm | LÝ BẠCH | 20 | 20"
                className="w-full bg-[#070a12] border border-slate-800 rounded-2xl p-4 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />

              {/* Preview Phân Bổ 4 Vòng */}
              {fullExamResult && fullExamResult.totalQuestions > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-500/50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> ĐÃ NHẬN DIỆN THÀNH CÔNG {fullExamResult.totalQuestions} CÂU HỎI TRONG 4 VÒNG:
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {fullExamResult.rounds.map((r) => (
                      <div key={r.roundIndex} className="bg-[#070a12] p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{r.roundTitle}:</span>
                        <span className="font-mono text-base font-black text-amber-400">{r.questions.length} câu</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={() => setIsImportModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Hủy
              </Button>
              <Button
                disabled={!fullExamResult || fullExamResult.totalQuestions === 0}
                onClick={handleApplyFullExam}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11 px-6 rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Check className="w-4 h-4 mr-1.5" /> Nạp Vào Toàn Bộ 4 Vòng Thi ({fullExamResult?.totalQuestions || 0} Câu)
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
            Tự động đồng bộ lên Cloud Database • Import 1 file duy nhất cho cả 4 vòng thi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportFullExam}
            className="border-slate-700 text-slate-300 hover:text-white text-xs h-10 px-3.5 gap-1.5 rounded-xl cursor-pointer"
            title="Tải toàn bộ bộ đề hiện tại về máy tính dưới dạng file JSON"
          >
            <FileDown className="w-4 h-4 text-amber-400" /> Xuất File Đề Thi
          </Button>

          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-10 px-4 gap-2 rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Layers className="w-4 h-4" /> Import 1 File Cho Cả 4 Vòng
          </Button>

          {savedAlert && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-500/60 flex items-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4" /> Đã đồng bộ Cloud thành công!
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

      {/* CẤU HÌNH THỜI GIAN & CHỦ ĐỀ VÒNG THI NÀY */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white uppercase block">
                {currentRound.title}
              </span>
              <button
                onClick={handleOpenEditRound}
                className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 underline cursor-pointer"
              >
                <Edit2 className="w-3 h-3" /> Đổi tên / Chủ đề
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {currentRound.description || "Chưa có mô tả chủ đề"}
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