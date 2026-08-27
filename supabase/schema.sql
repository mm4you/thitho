-- ==========================================================
-- HỆ THỐNG GAMESHOW ĐẤU TRÍ (FORMAT OLYMPIA)
-- SUPABASE POSTGRESQL SCHEMA & REALTIME SETUP
-- ==========================================================

-- 1. Bảng Matches (Trận đấu)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'CHUNG KẾT ĐƯỜNG LÊN ĐỈNH TRI THỨC',
    status TEXT DEFAULT 'active', -- draft, active, finished
    current_round_index INT DEFAULT 0,
    current_question_index INT DEFAULT 0,
    current_question_id UUID,
    is_timer_running BOOLEAN DEFAULT false,
    time_left INT DEFAULT 15,
    is_locked BOOLEAN DEFAULT false,
    is_revealed BOOLEAN DEFAULT false,
    is_scored BOOLEAN DEFAULT false,
    buzzer_winner_slot INT DEFAULT NULL,
    buzzer_winner_time_ms INT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng Players (4 Thí sinh)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    slot_number INT NOT NULL, -- 1, 2, 3, 4
    name TEXT NOT NULL,
    school_name TEXT DEFAULT 'THPT Chuyên',
    avatar_url TEXT DEFAULT '',
    score INT DEFAULT 0,
    is_connected BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, slot_number)
);

-- 3. Bảng Rounds (Các Vòng thi)
CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    round_type TEXT NOT NULL, -- 'khoi_dong', 'vcnv', 'tang_toc', 've_dich', 'custom'
    title TEXT NOT NULL,
    order_index INT NOT NULL,
    description TEXT DEFAULT '',
    config JSONB DEFAULT '{}'::jsonb
);

-- 4. Bảng Questions (Ngân hàng Câu hỏi)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    question_text TEXT NOT NULL,
    media_url TEXT DEFAULT '',
    media_type TEXT DEFAULT 'none', -- 'image', 'audio', 'video', 'none'
    question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'text_input', 'buzzer'
    options JSONB DEFAULT '[]'::jsonb, -- ["A", "B", "C", "D"]
    correct_answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    time_limit INT DEFAULT 15,
    points_correct INT DEFAULT 10,
    points_wrong INT DEFAULT 0
);

-- 5. Bảng Player Responses (Lịch sử nộp câu trả lời)
CREATE TABLE IF NOT EXISTS player_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    slot_number INT NOT NULL,
    answer_text TEXT DEFAULT '',
    response_time_ms INT DEFAULT 0,
    is_correct BOOLEAN DEFAULT NULL,
    points_awarded INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, question_id, slot_number)
);

-- Kích hoạt Realtime Replication cho các bảng
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE player_responses;

-- Cho phép truy cập nặc danh (Anon Key) để đọc ghi realtime tiện lợi
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on questions" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on player_responses" ON player_responses FOR ALL USING (true) WITH CHECK (true);
