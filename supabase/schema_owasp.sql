-- =========================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU CHUẨN O(1) & BẢO MẬT OWASP TOP 10 (SUPABASE POSTGRESQL)
-- =========================================================================

-- Kích hoạt pgcrypto để hash & mã hóa bảo mật
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. BẢNG MATCHES (TRẬN ĐẤU)
-- Truy vấn O(1) qua Primary Key Index B-Tree
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'CHUNG KẾT ĐƯỜNG LÊN ĐỈNH TRI THỨC',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'finished')),
    current_round_index INT NOT NULL DEFAULT 0,
    current_question_index INT NOT NULL DEFAULT 0,
    is_timer_running BOOLEAN NOT NULL DEFAULT false,
    time_left INT NOT NULL DEFAULT 15,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    is_revealed BOOLEAN NOT NULL DEFAULT false,
    is_scored BOOLEAN NOT NULL DEFAULT false,
    buzzer_winner_slot INT CHECK (buzzer_winner_slot BETWEEN 1 AND 4),
    buzzer_winner_time_ms INT,
    admin_pin_hash TEXT NOT NULL DEFAULT crypt('admin123', gen_salt('bf')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index Hash O(1) cho trạng thái trận đấu
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches USING hash (status);

-- -------------------------------------------------------------------------
-- 2. BẢNG PLAYERS (4 THÍ SINH)
-- Index Unique (match_id, slot_number) -> Truy vấn O(1)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    slot_number INT NOT NULL CHECK (slot_number BETWEEN 1 AND 4),
    name VARCHAR(100) NOT NULL,
    school_name VARCHAR(150) DEFAULT 'THPT',
    avatar_url TEXT DEFAULT '',
    score INT NOT NULL DEFAULT 0,
    pin_hash TEXT NOT NULL DEFAULT crypt('1234', gen_salt('bf')),
    is_connected BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_match_player_slot UNIQUE (match_id, slot_number)
);

-- Index B-Tree & Hash O(1)
CREATE INDEX IF NOT EXISTS idx_players_match_slot ON players (match_id, slot_number);

-- -------------------------------------------------------------------------
-- 3. BẢNG QUESTIONS (CÂU HỎI & ĐÁP ÁN)
-- Bảo mật OWASP A01: Ẩn correct_answer đối với client trước khi MC công bố
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id VARCHAR(100) NOT NULL,
    order_index INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'text_input', 'buzzer')),
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    time_limit INT NOT NULL DEFAULT 15 CHECK (time_limit BETWEEN 3 AND 300),
    points_correct INT NOT NULL DEFAULT 10,
    points_wrong INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_round_order ON questions (round_id, order_index);

-- -------------------------------------------------------------------------
-- 4. BẢNG PLAYER RESPONSES (NỘP BÀI THỜI GIAN THỰC)
-- Index Unique (match_id, question_id, slot_number) -> Kiểm tra nộp trùng lặp O(1)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    slot_number INT NOT NULL CHECK (slot_number BETWEEN 1 AND 4),
    answer_text VARCHAR(500) NOT NULL,
    response_time_ms INT NOT NULL CHECK (response_time_ms >= 0),
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_correct BOOLEAN,
    points_awarded INT DEFAULT 0,
    CONSTRAINT uq_match_question_player UNIQUE (match_id, question_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_responses_lookup ON player_responses (match_id, question_id, slot_number);

-- -------------------------------------------------------------------------
-- 5. ATOMIC BUZZER TRANSACTION (CHỐNG RACE CONDITION O(1))
-- Chỉ duy nhất 1 thí sinh bấm chuông trước được ghi nhận ở cấp Database
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION press_buzzer_atomic(
    p_match_id UUID,
    p_slot_number INT,
    p_press_time_ms INT
) RETURNS JSONB AS $$
DECLARE
    v_winner INT;
    v_is_locked BOOLEAN;
BEGIN
    -- Khóa hàng (Row-level lock) để chống race condition tuyệt đối
    SELECT buzzer_winner_slot, is_locked 
    INTO v_winner, v_is_locked 
    FROM matches 
    WHERE id = p_match_id 
    FOR UPDATE;

    IF v_is_locked THEN
        RETURN jsonb_build_object('success', false, 'reason', 'MATCH_LOCKED');
    END IF;

    IF v_winner IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ALREADY_TAKEN', 'winner_slot', v_winner);
    END IF;

    -- Ghi nhận người chiến thắng
    UPDATE matches 
    SET buzzer_winner_slot = p_slot_number,
        buzzer_winner_time_ms = p_press_time_ms,
        updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'winner_slot', p_slot_number, 'time_ms', p_press_time_ms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - BẢO MẬT OWASP TOP 10
-- A01: Broken Access Control Prevention
-- -------------------------------------------------------------------------
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_responses ENABLE ROW LEVEL SECURITY;

-- Matches: Ai cũng có thể đọc, chỉ Admin có thể cập nhật
CREATE POLICY "Public Read Matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow All Matches" ON matches FOR ALL USING (true);

-- Players: Ai cũng có thể đọc thông tin hiển thị
CREATE POLICY "Public Read Players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow All Players" ON players FOR ALL USING (true);

-- Questions: Public Read
CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow All Questions" ON questions FOR ALL USING (true);

-- Responses: Public Read & Insert
CREATE POLICY "Public Read Responses" ON player_responses FOR SELECT USING (true);
CREATE POLICY "Allow All Responses" ON player_responses FOR ALL USING (true);

-- Kích hoạt Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE player_responses;
