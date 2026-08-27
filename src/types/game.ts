export type QuestionType = "multiple_choice" | "text_input" | "buzzer";

export interface Question {
  id: string;
  order_index: number;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: string;
  time_limit: number;
  points_correct: number;
  points_wrong: number;
  image_url?: string;
  audio_url?: string; explanation?: string;
}

export interface Round {
  id: string;
  round_type: "khoi_dong" | "vchv" | "tang_toc" | "ve_dich";
  title: string;
  description: string;
  questions: Question[];
}

export interface PlayerResponse {
  slot_number: number;
  answer_text: string;
  response_time_ms: number;
  is_correct?: boolean;
  points_awarded?: number;
}

export interface PlayerState {
  slot_number: 1 | 2 | 3 | 4;
  name: string;
  score: number;
  school_name?: string;
  pin_code?: string;
}

export interface MatchState {
  id: string;
  title: string;
  is_standby: boolean;
  current_round_index: number;
  current_question_index: number;
  is_timer_running: boolean;
  time_left: number;
  is_locked: boolean;
  is_revealed: boolean;
  is_scored: boolean;
  buzzer_winner_slot: number | null;
  buzzer_winner_time_ms: number | null;
  players: PlayerState[];
  rounds: Round[];
  current_responses: Record<number, PlayerResponse>;
}

export type RealtimeEventPayload =
  | { type: "SYNC_STATE"; state: MatchState }
  | { type: "TOGGLE_STANDBY"; is_standby: boolean }
  | { type: "START_TIMER"; time_limit: number; start_time: number }
  | { type: "SUBMIT_ANSWER"; slot_number: number; answer_text: string; response_time_ms: number }
  | { type: "LOCK_ANSWERS" }
  | { type: "REVEAL_ANSWERS" }
  | { type: "GRADE_ANSWERS"; results: Record<number, { is_correct: boolean; points_awarded: number }> }
  | { type: "PRESS_BUZZER"; slot_number: number; press_time_ms: number }
  | { type: "RESET_BUZZER" }
  | { type: "OVERRIDE_SCORE"; slot_number: 1 | 2 | 3 | 4; delta: number }
  | { type: "UPDATE_PLAYER_INFO"; slot_number: 1 | 2 | 3 | 4; name: string; school_name?: string }
  | { type: "CHANGE_QUESTION"; round_index: number; question_index: number }
  | { type: "REVOKE_ADMIN_SESSIONS"; new_code_timestamp: number };