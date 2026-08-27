"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadSavedMatchState,
  saveMatchStateLocally,
  sendGameEvent,
  subscribeToGameChannel,
  getAdminPassword,
  setAdminPassword,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Sliders,
  Users,
  HelpCircle,
  Tv,
  ArrowRight,
  Trophy,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 6, prefix = ""): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminDashboardPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [originUrl, setOriginUrl] = useState<string>("");

  // MC Password State
  const [currentAdminPass, setCurrentAdminPass] = useState<string>("MC-OLYMPIA-2026");
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [isEditingAdminPass, setIsEditingAdminPass] = useState<boolean>(false);
  const [tempAdminPass, setTempAdminPass] = useState<string>("");
  const [adminPassSavedAlert, setAdminPassSavedAlert] = useState<boolean>(false);
  const [copiedAdminPass, setCopiedAdminPass] = useState<boolean>(false);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
      const pass = getAdminPassword();
      setCurrentAdminPass(pass);
      setTempAdminPass(pass);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      if (event.type === "UPDATE_PLAYER_INFO") {
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

  // Sinh Mã MC Mới
  const handleGenerateRandomAdminPass = () => {
    const newPass = generateAlphanumericCode(6, "MC-");
    setTempAdminPass(newPass);
    setIsEditingAdminPass(true);
  };

  const handleSaveAdminPass = () => {
    if (!tempAdminPass.trim()) return;
    setAdminPassword(tempAdminPass.trim());
    setCurrentAdminPass(tempAdminPass.trim());
    setIsEditingAdminPass(false);
    setAdminPassSavedAlert(true);
    setTimeout(() => setAdminPassSavedAlert(false), 3000);
  };

  const handleCopyAdminPass = () => {
    navigator.clipboard.writeText(currentAdminPass);
    setCopiedAdminPass(true);
    setTimeout(() => setCopiedAdminPass(false), 2000);
  };

  // Sinh Mã 4 Thí Sinh
  const handleGenerateRandomPlayerCodes = () => {
    const updatedPlayers = matchState.players.map((p) => {
      const randCode = generateAlphanumericCode(5);
      return { ...p, pin_code: randCode };
    });

    const newState = { ...matchState, players: updatedPlayers };
    setMatchState(newState);
    saveMatchStateLocally(newState);
    sendGameEvent({ type: "SYNC_STATE", state: newState });
  };

  const handleCopyLink = (slot: number, code: string) => {
    const joinUrl = `${originUrl || "http://localhost:3000"}/join?slot=${slot}&pin=${code}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedSlot(slot);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const handleResetScores = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại điểm số của 4 thí sinh về 0?")) {
      const updatedPlayers = matchState.players.map((p) => ({ ...p, score: 0 }));
      const newState = { ...matchState, players: updatedPlayers };
      setMatchState(newState);
      saveMatchStateLocally(newState);
      sendGameEvent({ type: "SYNC_STATE", state: newState });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans select-none">
      {/* Tiêu Đề Trung Tâm Quản Trị Hệ Thống */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            TRUNG TÂM QUẢN TRỊ TOÀN BỘ HỆ THỐNG
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Bảng điều khiển tối cao: Quản lý mã truy cập MC, cấp mã bảo mật 4 thí sinh và điều phối trận đấu
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/display" target="_blank">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer">
              <Tv className="w-4 h-4" /> Màn Hình Máy Chiếu
            </Button>
          </Link>
          <Link href="/admin/live">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow cursor-pointer">
              <Sliders className="w-4 h-4" /> Bảng Điều Khiển MC
            </Button>
          </Link>
        </div>
      </div>

      {/* KHU VỰC 1: QUẢN TRỊ MÃ TRUY CẬP CỦA MC (BẠN SINH & QUẢN LÝ TẠI ĐÂY) */}
      <div className="bg-[#0d1322] border-2 border-blue-900 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-white">MẬT KHẨU QUẢN TRỊ MC (DO BẠN TẠO)</h2>
              <p className="text-xs text-slate-400 font-medium">Bạn sinh mã ngẫu nhiên tại đây để cấp quyền cho MC điều phối trận đấu</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateRandomAdminPass}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-4 gap-2 cursor-pointer shadow"
          >
            <RefreshCw className="w-4 h-4" /> Sinh Mã MC Ngẫu Nhiên Mới
          </Button>
        </div>

        {isEditingAdminPass ? (
          <div className="flex flex-wrap items-center gap-3 bg-[#070b14] p-4 rounded-2xl border border-blue-900">
            <input
              type="text"
              value={tempAdminPass}
              onChange={(e) => setTempAdminPass(e.target.value)}
              placeholder="Nhập mã MC mới..."
              className="flex-1 min-w-[240px] bg-[#0d1322] border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-blue-500 uppercase"
            />
            <Button
              size="sm"
              onClick={handleSaveAdminPass}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11 px-5 gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Mã MC Lâu Dài
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingAdminPass(false)}
              className="text-xs h-11 text-slate-400 hover:text-white"
            >
              Hủy
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between bg-[#070b14] p-5 rounded-2xl border border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <KeyRound className="w-6 h-6 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">MÃ MC ĐANG HOẠT ĐỘNG:</span>
                <span className="font-mono text-2xl font-black text-amber-400 tracking-wider">
                  {showAdminPass ? currentAdminPass : "••••••••••••"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title={showAdminPass ? "Ẩn" : "Hiện"}
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <Button
                size="sm"
                onClick={handleCopyAdminPass}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-4 gap-1.5 cursor-pointer"
              >
                {copiedAdminPass ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Đã Copy Mã MC!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Mã Cấp Cho MC
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTempAdminPass(currentAdminPass);
                  setIsEditingAdminPass(true);
                }}
                className="border-slate-700 text-slate-300 text-xs h-10 px-3 cursor-pointer"
              >
                Chỉnh Sửa
              </Button>
            </div>
          </div>
        )}

        {adminPassSavedAlert && (
          <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/60 text-center animate-in fade-in">
            Đã lưu mã MC mới thành công vào hệ thống để sử dụng lâu dài!
          </p>
        )}
      </div>

      {/* KHU VỰC 2: QUẢN LÝ MÃ BẢO MẬT 4 THÍ SINH */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              MÃ BẢO MẬT 4 MÁY THÍ SINH (CHỮ & SỐ)
            </h2>
            <p className="text-xs text-slate-400 font-medium">Bạn sinh mã ngẫu nhiên cho từng máy và gửi link cho thí sinh đăng nhập</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetScores}
              className="border-slate-800 text-slate-400 hover:text-red-400 text-xs h-9 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Điểm
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateRandomPlayerCodes}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9 px-4 gap-1.5 cursor-pointer shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sinh Mã Mới 4 Máy
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const code = player.pin_code || `${player.slot_number}${player.slot_number}${player.slot_number}${player.slot_number}`;

            return (
              <div
                key={player.slot_number}
                className="bg-[#0d1322] border-2 border-blue-900/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white">
                      {player.slot_number}
                    </span>
                    <span className="font-black text-sm text-white uppercase">MÁY {player.slot_number}</span>
                  </div>
                  <span className="font-mono text-base font-black text-amber-400">{player.score} đ</span>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-sm text-white line-clamp-1">{player.name}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">{player.school_name || "Thí sinh"}</div>
                </div>

                <div className="bg-[#070b14] border border-blue-950 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">MÃ BẢO MẬT:</span>
                  <span className="font-mono text-2xl font-black text-amber-400 tracking-widest">{code}</span>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleCopyLink(player.slot_number, code)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer"
                  >
                    {copiedSlot === player.slot_number ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã Copy Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link Cho TS {player.slot_number}
                      </>
                    )}
                  </Button>

                  <a
                    href={`/join?slot=${player.slot_number}&pin=${code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-slate-400 hover:text-blue-400 flex items-center justify-center gap-1 py-1"
                  >
                    Mở kết nối máy này <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KHU VỰC 3: 3 LỐI VÀO CHÍNH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <Link href="/admin/live" className="block group">
          <div className="bg-[#0d1322] border-2 border-blue-900 group-hover:border-blue-500 rounded-2xl p-6 transition-all shadow-xl space-y-3">
            <Sliders className="w-8 h-8 text-blue-400" />
            <h3 className="text-base font-black uppercase text-white">1. Bảng MC Điều Khiển</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tiến trình 5 bước: Bắt đầu đếm ngược, khóa bài, mở đáp án, chấm điểm tự động và câu tiếp theo.
            </p>
          </div>
        </Link>

        <Link href="/admin/questions" className="block group">
          <div className="bg-[#0d1322] border-2 border-blue-900 group-hover:border-blue-500 rounded-2xl p-6 transition-all shadow-xl space-y-3">
            <HelpCircle className="w-8 h-8 text-emerald-400" />
            <h3 className="text-base font-black uppercase text-white">2. Ngân Hàng Câu Hỏi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Soạn đề và nạp nhanh câu hỏi cho 4 vòng: Khởi động, Vượt chướng ngại vật, Tăng tốc, Về đích.
            </p>
          </div>
        </Link>

        <Link href="/display" target="_blank" className="block group">
          <div className="bg-[#0d1322] border-2 border-blue-900 group-hover:border-blue-500 rounded-2xl p-6 transition-all shadow-xl space-y-3">
            <Tv className="w-8 h-8 text-amber-400" />
            <h3 className="text-base font-black uppercase text-white">3. Màn Hình Máy Chiếu</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Màn hình sân khấu hội trường: Chế độ chờ bảng điểm 4 thí sinh và chế độ thi đấu trực tiếp.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}