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
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function generateAlphanumericCode(length = 6, prefix = "GK-"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function SupremeAdminDashboardPage() {
  const [matchState, setMatchState] = useState<MatchState>(loadSavedMatchState);
  const [currentAdminPass, setCurrentAdminPass] = useState<string>("GK-4H46SH");
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [isEditingAdminPass, setIsEditingAdminPass] = useState<boolean>(false);
  const [tempAdminPass, setTempAdminPass] = useState<string>("");
  const [adminPassSavedAlert, setAdminPassSavedAlert] = useState<boolean>(false);
  const [copiedAdminPass, setCopiedAdminPass] = useState<boolean>(false);

  // Lay ma ban dau tu Server duy nhat mot lan khi mount
  useEffect(() => {
    fetch("/api/judge-code")
      .then((res) => res.json())
      .then((data) => {
        if (data?.judge_code) {
          setCurrentAdminPass(data.judge_code);
          setTempAdminPass(data.judge_code);
        }
      })
      .catch(() => {
        const local = getAdminPassword() || "GK-4H46SH";
        setCurrentAdminPass(local);
        setTempAdminPass(local);
      });
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

  const handleSaveAdminPass = async () => {
    if (!tempAdminPass.trim()) return;
    const newCode = tempAdminPass.trim().toUpperCase();

    setAdminPassword(newCode);
    setCurrentAdminPass(newCode);
    setIsEditingAdminPass(false);
    setAdminPassSavedAlert(true);

    const newState: MatchState = {
      ...matchState,
      admin_access_code: newCode,
    };
    setMatchState(newState);
    syncMatchStateToCloud(newState);

    // Day len Server API de cap nhat duy nhat ma nay
    try {
      await fetch("/api/judge-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judge_code: newCode, match_state: newState }),
      });
    } catch {
      // Fallback
    }

    sendGameEvent({ type: "UPDATE_JUDGE_ACCESS_CODE", code: newCode });
    sendGameEvent({ type: "SYNC_STATE", state: newState });
    sendGameEvent({ type: "REVOKE_ADMIN_SESSIONS", new_code_timestamp: Date.now() });

    setTimeout(() => setAdminPassSavedAlert(false), 3000);
  };

  const handleCopyAdminPass = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(currentAdminPass);
      setCopiedAdminPass(true);
      setTimeout(() => setCopiedAdminPass(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans select-none">
      {/* Tiêu đề Super Admin */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> BẢNG ĐIỀU KHIỂN TỐI CAO (SUPER ADMIN)
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Quản lý mã bảo mật, phân quyền Giám Khảo & kiểm soát toàn bộ phòng đấu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/live">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer">
              Vào Bàn Giám Khảo
            </Button>
          </Link>
          <Link href="/display" target="_blank">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white text-xs h-9 px-3 rounded-xl cursor-pointer">
              <Tv className="w-4 h-4 mr-1.5" /> Mở Màn Máy Chiếu
            </Button>
          </Link>
        </div>
      </div>

      {/* KHU VỰC CẤP & ĐỔI MÃ BẢO MẬT BAN GIÁM KHẢO */}
      <div className="bg-[#0d121f] border-2 border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold uppercase text-white">MÃ BẢO MẬT TRUY CẬP DUY NHẤT CỦA BAN GIÁM KHẢO</h2>
              <p className="text-xs text-slate-400">Khi đổi mã mới, toàn bộ mã cũ sẽ bị vô hiệu hóa ngay lập tức</p>
            </div>
          </div>

          {adminPassSavedAlert && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg animate-in fade-in">
              <Check className="w-4 h-4" /> Đã lưu & kích hoạt mã mới duy nhất!
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px] bg-[#070a12] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            {isEditingAdminPass ? (
              <input
                type="text"
                value={tempAdminPass}
                onChange={(e) => setTempAdminPass(e.target.value.toUpperCase())}
                placeholder="Nhập mã mới..."
                className="bg-transparent text-sm font-mono font-bold text-amber-400 uppercase focus:outline-none w-full"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                  {showAdminPass ? currentAdminPass : "••••••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {isEditingAdminPass ? (
                <>
                  <Button size="sm" onClick={handleSaveAdminPass} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 rounded-lg font-bold">
                    <Save className="w-3.5 h-3.5 mr-1" /> Lưu Mã
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingAdminPass(false)} className="text-slate-400 text-xs h-8 px-2">
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleCopyAdminPass} className="border-slate-800 text-slate-300 hover:text-white text-xs h-8 px-2.5 rounded-lg">
                    {copiedAdminPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="ml-1">{copiedAdminPass ? "Đã chép" : "Sao chép"}</span>
                  </Button>
                  <Button size="sm" onClick={() => { setTempAdminPass(currentAdminPass); setIsEditingAdminPass(true); }} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-8 px-3 rounded-lg">
                    Sửa mã
                  </Button>
                </>
              )}
            </div>
          </div>

          <Button
            onClick={handleGenerateRandomAdminPass}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-12 px-4 rounded-xl gap-2 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            TẠO MÃ BẢO MẬT MỚI TỰ ĐỘNG
          </Button>
        </div>
      </div>

      {/* ĐIỀU KHIỂN NHANH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase block">TRẠNG THÁI HỆ THỐNG</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-bold text-white">Trực Tuyến & Đồng Bộ Thời Gian Thực</span>
          </div>
          <p className="text-xs text-slate-500">Mã phòng: <span className="font-mono text-amber-400 font-bold">OLYMQUIZ-ARENA</span></p>
        </div>

        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase block">QUẢN LÝ THÍ SINH</span>
          <p className="text-xs text-slate-400">4 máy đấu sẵn sàng. Tự động cấp mã PIN cho từng máy.</p>
          <Link href="/admin/players" className="inline-block text-xs font-bold text-blue-400 hover:underline">
            Đến Trang Quản Lý Thí Sinh →
          </Link>
        </div>

        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase block">NGÂN HÀNG ĐỀ THI</span>
          <p className="text-xs text-slate-400">Bộ câu hỏi 4 vòng chuẩn format Olympia.</p>
          <Link href="/admin/questions" className="inline-block text-xs font-bold text-blue-400 hover:underline">
            Đến Trang Soạn Đề Thi →
          </Link>
        </div>
      </div>
    </div>
  );
}
