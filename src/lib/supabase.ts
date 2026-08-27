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
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel("olympia_local_bus");
}

export function subscribeToGameChannel(onEvent: (event: RealtimeEventPayload) => void) {
  const channel = supabase.channel(CHANNEL_NAME, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "game_action" }, (payload) => {
      if (payload?.payload) {
        onEvent(payload.payload as RealtimeEventPayload);
      }
    })
    .subscribe();

  const handleLocal = (e: MessageEvent) => {
    if (e.data) {
      onEvent(e.data as RealtimeEventPayload);
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleLocal);
  }

  return () => {
    supabase.removeChannel(channel);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleLocal);
    }
  };
}

export async function sendGameEvent(event: RealtimeEventPayload) {
  if (broadcastChannel) {
    broadcastChannel.postMessage(event);
  }

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

export function loadSavedMatchState(): MatchState {
  if (typeof window === "undefined") return initialMatchState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
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
    localStorage.setItem(ADMIN_PASS_KEY, newPassword.trim());
  } catch {
    // Fallback
  }
}