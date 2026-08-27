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
  syncMatchStateToCloud,
} from "@/lib/supabase";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import {
  Crown,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sliders,
  Tv,
  Activity,
  Lock,
  Unlock,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 6, prefix = ""): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function SupremeAdminDashboardPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [currentAdminPass, setCurrentAdminPass] = useState<string>("GK-OLYMPIA-2026");
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [isEditingAdminPass, setIsEditingAdminPass] = useState<boolean>(false);
  const [tempAdminPass, setTempAdminPass] = useState<string>("");
  const [adminPassSavedAlert, setAdminPassSavedAlert] = useState<boolean>(false);
  const [copiedAdminPass, setCopiedAdminPass] = useState<boolean>(false);

  // Health Monitoring
  const [lastPing, setLastPing] = useState<number>(Date.now());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pass = getAdminPassword();
      setCurrentAdminPass(pass);
      setTempAdminPass(pass);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToGameChannel((event: RealtimeEventPayload) => {
      setLastPing(Date.now());
      if (event.type === "UPDATE_PLAYER_INFO") {
        setMatchState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.slot_number === event.slot_number
              ? { ...p, name: event.name, school_name: event.school_name }
              : p
          ),
        }));
      } else if (event.type === "SYNC_STATE") {
        setMatchState(event.state);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateRandomAdminPass = () => {
    const newPass = generateAlphanumericCode(6, "GK-");
    setTempAdminPass(newPass);
    setIsEditingAdminPass(true);
  };

  const handleSaveAdminPass = () => {
    if (!tempAdminPass.trim()) return;
    setAdminPassword(tempAdminPass.trim());
    setCurrentAdminPass(tempAdminPass.trim());
    setIsEditingAdminPass(false);
    setAdminPassSavedAlert(true);
    // Phat tin hieu huy toan bo phien dang nhap cua ma cu
    sendGameEvent({ type: "REVOKE_ADMIN_SESSIONS", new_code_timestamp: Date.now() });
    setTimeout(() => setAdminPassSavedAlert(false), 3000);
  };

  const handleCopyAdminPass = () => {
    navigator.clipboard.writeText(currentAdminPass);
    setCopiedAdminPass(true);
    setTimeout(() => setCopiedAdminPass(false), 2000);
  };

  const handleEmergencyFreeze = () => {
    const nextLocked = !matchState.is_locked;
    const newState = {
      ...matchState,
      is_locked: nextLocked,
      is_timer_running: false,
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);
    sendGameEvent({ type: "LOCK_ANSWERS" });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    alert(nextLocked ? "ĐÃ ĐÓNG BĂNG TOÀN BỘ PHÒNG THI!" : "ĐÃ MỞ KHÓA PHÒNG THI!");
  };

  const handleBackupMatch = () => {
    const dataStr = JSON.stringify(matchState, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_toan_bo_tran_dau_${Date.now()}.json`;
    link.click();
  };

  const handleMasterResetMatch = () => {
    if (confirm("CẢNH BÁO QUẢN TRỊ VIÊN TỐI CAO: Bạn có chắc chắn muốn đặt lại điểm số và toàn bộ trạng thái thi đấu về ban đầu?")) {
      const resetPlayers = matchState.players.map((p) => ({ ...p, score: 0 }));
      const newState: MatchState = {
        ...matchState,
        is_standby: true,
        is_timer_running: false,
        time_left: 15,
        is_locked: false,
        is_revealed: false,
        is_scored: false,
        buzzer_winner_slot: null,
        buzzer_winner_time_ms: null,
        current_round_index: 0,
        current_question_index: 0,
        players: resetPlayers,
        current_responses: {},
      };
      setMatchState(newState);
      syncMatchStateToCloud(newState);
      sendGameEvent({ type: "SYNC_STATE", state: newState });
      alert("Đã khởi động lại toàn bộ trận đấu!");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans select-none">
      {/* Header Siêu Cấp */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <Crown className="w-3.5 h-3.5" /> SUPREME CONTROLLER • QUẢN TRỊ TỐI CAO
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            TRUNG TÂM QUẢN TRỊ SIÊU CẤP
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Tổng tư lệnh điều phối: Quản lý mã Giám Khảo, giám sát kết nối thời gian thực và can thiệp khẩn cấp
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/display" target="_blank">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-10 px-4 gap-1.5 shadow cursor-pointer">
              <Tv className="w-4 h-4" /> Màn Hình Máy Chiếu
            </Button>
          </Link>
          <Link href="/admin/live">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow cursor-pointer">
              <Sliders className="w-4 h-4" /> Bàn Ban Giám Khảo
            </Button>
          </Link>
        </div>
      </div>

      {/* KHU VỰC 1: QUẢN TRỊ MÃ TRUY CẬP BAN GIÁM KHẢO (ĐỘC QUYỀN SUPER ADMIN) */}
      <div className="bg-[#0d121f] border-2 border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-white">MÃ BAN GIÁM KHẢO (DO BẠN TẠO & THU HỒI)</h2>
              <p className="text-xs text-slate-400 font-medium">Cấp mã này cho Ban Giám Khảo để họ vào điều hành trận đấu và quản lý 4 thí sinh</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateRandomAdminPass}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4" /> Sinh Mã Giám Khảo Mới
          </Button>
        </div>

        {isEditingAdminPass ? (
          <div className="flex flex-wrap items-center gap-3 bg-[#070a12] p-4 rounded-2xl border border-slate-800">
            <input
              type="text"
              value={tempAdminPass}
              onChange={(e) => setTempAdminPass(e.target.value)}
              placeholder="Nhập mã Giám Khảo mới..."
              className="flex-1 min-w-[240px] bg-[#0d121f] border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400 uppercase"
            />
            <Button
              size="sm"
              onClick={handleSaveAdminPass}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-11 px-5 gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu & Thu Hồi Mã Cũ
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
          <div className="flex flex-wrap items-center justify-between bg-[#070a12] p-5 rounded-2xl border border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <KeyRound className="w-6 h-6 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">MÃ GIÁM KHẢO ĐANG HOẠT ĐỘNG:</span>
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
                    <Check className="w-4 h-4 text-emerald-400" /> Đã Copy!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Mã Cấp Cho Giám Khảo
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
                className="border-slate-700 text-slate-300 text-xs h-10 px-3.5 cursor-pointer"
              >
                Chỉnh Sửa
              </Button>
            </div>
          </div>
        )}

        {adminPassSavedAlert && (
          <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/60 text-center animate-in fade-in">
            Đã lưu mã mới và lập tức hủy phiên làm việc của mã cũ!
          </p>
        )}
      </div>

      {/* KHU VỰC 2: GIÁM SÁT THỜI GIAN THỰC (REALTIME CONNECTION MONITOR) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold uppercase text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            GIÁM SÁT LUỒNG TRẬN ĐẤU & 4 THÍ SINH
          </h2>
          <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 px-3 py-1 rounded-full font-mono font-bold">
            SUPABASE REALTIME: ĐANG KẾT NỐI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchState.players.map((player) => {
            const resp = matchState.current_responses[player.slot_number];
            return (
              <div
                key={player.slot_number}
                className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                      {player.slot_number}
                    </span>
                    <span className="font-bold text-xs text-white uppercase">{player.name}</span>
                  </div>
                  <span className="font-mono text-base font-bold text-amber-400">{player.score} đ</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-400">Trường: <span className="text-white font-medium">{player.school_name || "Thí sinh"}</span></div>
                  <div className="text-slate-400">Mã PIN: <span className="font-mono font-bold text-amber-400">{player.pin_code || "CHƯA ĐẶT"}</span></div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#070a12] border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  {resp ? (
                    <span className="font-bold text-emerald-400">Đã nộp bài ({(resp.response_time_ms / 1000).toFixed(2)}s)</span>
                  ) : (
                    <span className="text-slate-600">Đang chờ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KHU VỰC 3: QUYỀN CAN THIỆP KHẨN CẤP (MASTER EMERGENCY OVERRIDES) */}
      <div className="bg-[#0d121f] border border-red-500/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase text-white">CAN THIỆP KHẨN CẤP TOÀN HỆ THỐNG</h2>
            <p className="text-xs text-slate-400 font-medium">Chỉ Quản Trị Viên Tối Cao mới có quyền kích hoạt các lệnh khẩn cấp này</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleEmergencyFreeze}
            className="p-4 rounded-2xl bg-[#070a12] border border-amber-500/50 hover:bg-amber-950/20 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-400">1. Đóng Băng / Mở Khóa Phòng Thi</span>
              {matchState.is_locked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Khóa cứng toàn bộ 4 máy thí sinh và dừng đồng hồ ngay lập tức nếu có sự cố phòng thi.
            </p>
          </button>

          <button
            onClick={handleBackupMatch}
            className="p-4 rounded-2xl bg-[#070a12] border border-blue-500/50 hover:bg-blue-950/20 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-blue-400">2. Sao Lưu Trận Đấu Nhanh</span>
              <Download className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              Xuất toàn bộ điểm số, câu hỏi và thời gian của trận đấu ra file JSON an toàn.
            </p>
          </button>

          <button
            onClick={handleMasterResetMatch}
            className="p-4 rounded-2xl bg-[#070a12] border border-red-500/50 hover:bg-red-950/20 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-red-400">3. Khởi Động Lại Trận Đấu</span>
              <RotateCcw className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              Reset điểm số 4 thí sinh về 0 và đưa màn hình máy chiếu về chế độ chờ ban đầu.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}