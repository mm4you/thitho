import { createClient } from "@supabase/supabase-js";
import { MatchState, RealtimeEventPayload } from "@/types/game";
import { initialMatchState } from "./mockData";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tnelelxbjdkvzfgxdchj.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_5OuRWIUz-0cMVOH4LwMcOg_M4w1XLvU";

export const SUPER_ADMIN_EMAIL = "ungnhutkhang53@gmail.com";
export const DEFAULT_MASTER_PASS = "OlymQuiz@Khang2026!";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

const CHANNEL_NAME = "olympia_match_room";

/**
 * ĐĂNG KÝ LẮNG NGHE SỰ KIỆN TỪ SUPABASE CHANNEL
 * - Không gây vòng lặp (No echo loops)
 * - Tự động tải state mới nhất từ Server khi khởi tạo
 */
export function subscribeToGameChannel(onEvent: (event: RealtimeEventPayload) => void) {
  // 1. Tải state mới nhất từ Server 1 lần duy nhất khi mở trang
  if (typeof window !== "undefined") {
    fetch("/api/sync-match")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.state) {
          saveMatchStateLocally(data.state);
          onEvent({ type: "SYNC_STATE", state: data.state });
        }
      })
      .catch(() => {});
  }

  // 2. Lắng nghe WebSocket Realtime từ Supabase
  const channel = supabase.channel(CHANNEL_NAME, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "game_action" }, (payload) => {
      if (payload?.payload) {
        const ev = payload.payload as RealtimeEventPayload;
        // Chỉ chuyển tiếp sự kiện cho UI, không phản hồi tự động để tránh Broadcast Storm
        onEvent(ev);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * PHÁT SỰ KIỆN TỚI TẤT CẢ CÁC THIẾT BỊ
 */
export async function sendGameEvent(event: RealtimeEventPayload) {
  try {
    const channel = supabase.channel(CHANNEL_NAME);
    await channel.send({
      type: "broadcast",
      event: "game_action",
      payload: event,
    });
  } catch (err) {
    console.warn("Supabase broadcast error:", err);
  }
}

const STORAGE_KEY = "olympia_current_match_state";
const ADMIN_PASS_KEY = "custom_admin_password";

/**
 * ĐỒNG BỘ TRẠNG THÁI TRẬN ĐẤU LÊN CLOUD SERVER VÀ PHÁT BROADCAST
 */
export async function syncMatchStateToCloud(state: MatchState) {
  saveMatchStateLocally(state);

  // 1. Lưu vào Server API trung tâm
  try {
    fetch("/api/sync-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  // 2. Phát broadcast tới các máy khác
  try {
    sendGameEvent({ type: "SYNC_STATE", state });
  } catch (err) {
    console.warn("Loi dong bo cloud:", err);
  }
}

export function loadSavedMatchState(): MatchState {
  if (typeof window === "undefined") return initialMatchState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.admin_access_code) {
        parsed.admin_access_code = getAdminPassword() || "GK-OLYMPIA-2026";
      }
      return parsed;
    }
  } catch {
    // Fallback
  }
  return initialMatchState;
}

export function saveMatchStateLocally(state: MatchState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (state.admin_access_code) {
      localStorage.setItem(ADMIN_PASS_KEY, state.admin_access_code);
    }
  } catch {
    // Fallback
  }
}

export function getAdminPassword(): string {
  if (typeof window === "undefined") return DEFAULT_MASTER_PASS;
  try {
    return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_MASTER_PASS;
  } catch {
    return DEFAULT_MASTER_PASS;
  }
}

export function setAdminPassword(newPassword: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_PASS_KEY, newPassword.trim().toUpperCase());
  } catch {
    // Fallback
  }
}
