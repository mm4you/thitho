export type RoundType = "khoi_dong" | "vcnv" | "tang_toc" | "ve_dich" | "custom";

export type QuestionType = "multiple_choice" | "text_input" | "buzzer";

export interface Player {
  id: string;
  match_id?: string;
  slot_number: 1 | 2 | 3 | 4;
  name: string;
  school_name?: string;
  avatar_url?: string;
  score: number;
  is_connected?: boolean;
}

export interface Question {
  id: string;
  round_id?: string;
  order_index: number;
  question_text: string;
  media_url?: string;
  media_type?: "none" | "image" | "audio" | "video";
  question_type: QuestionType;
  options?: string[]; // Cho trắc nghiệm: ["A. ...", "B. ...", "C. ...", "D. ..."]
  correct_answer: string;
  explanation?: string;
  time_limit: number; // giây
  points_correct: number;
  points_wrong: number;
}

export interface Round {
  id: string;
  match_id?: string;
  round_type: RoundType;
  title: string;
  order_index: number;
  description?: string;
  questions: Question[];
  config?: {
    cnv_keyword?: string; // Cho VCNV
    cnv_image_url?: string;
    obstacle_clues?: string[];
  };
}

export interface PlayerResponse {
  slot_number: 1 | 2 | 3 | 4;
  answer_text: string;
  response_time_ms: number;
  is_correct?: boolean | null;
  points_awarded?: number;
  submitted_at?: number;
}

export interface MatchState {
  id: string;
  title: string;
  status: "draft" | "active" | "finished";
  current_round_index: number;
  current_question_index: number;
  is_timer_running: boolean;
  time_left: number;
  is_locked: boolean;
  is_revealed: boolean;
  is_scored: boolean;
  buzzer_winner_slot: number | null;
  buzzer_winner_time_ms: number | null;
  players: Player[];
  rounds: Round[];
  current_responses: Record<number, PlayerResponse>; // key: slot_number 1..4
  timestamp?: number;
}

export type RealtimeEventPayload =
  | { type: "SYNC_STATE"; state: MatchState }
  | { type: "START_TIMER"; time_limit: number; start_time: number }
  | { type: "PAUSE_TIMER" }
  | { type: "LOCK_ANSWERS" }
  | { type: "REVEAL_ANSWERS" }
  | { type: "SUBMIT_ANSWER"; slot_number: 1 | 2 | 3 | 4; answer_text: string; response_time_ms: number }
  | { type: "PRESS_BUZZER"; slot_number: 1 | 2 | 3 | 4; press_time_ms: number }
  | { type: "RESET_BUZZER" }
  | { type: "GRADE_ANSWERS"; results: Record<number, { is_correct: boolean; points_awarded: number }> }
  | { type: "OVERRIDE_SCORE"; slot_number: 1 | 2 | 3 | 4; delta: number }
  | { type: "CHANGE_QUESTION"; round_index: number; question_index: number }
  | { type: "PLAY_SFX"; sfx: "correct" | "wrong" | "buzzer" | "tick" | "timeup" | "reveal" | "victory" };
