-- ============================================
-- 클럽 코트 운영사이트 - 초기 스키마
-- ============================================

-- 회원 테이블
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'sub_admin', 'user')),
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_location_lat DOUBLE PRECISION,
  last_location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 코트 테이블
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operating' CHECK (status IN ('operating', 'repairing', 'waiting', 'lesson')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 대기열 엔트리 테이블
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_preference_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'playing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 대기열 멤버 테이블
CREATE TABLE queue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_creator BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(queue_entry_id, member_id)
);

-- 시합 테이블
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  queue_entry_id UUID REFERENCES queue_entries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 시합 플레이어 테이블
CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  UNIQUE(match_id, member_id)
);

-- 스코어 테이블
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_members_auth_id ON members(auth_id);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_is_online ON members(is_online);
CREATE INDEX idx_courts_status ON courts(status);
CREATE INDEX idx_courts_display_order ON courts(display_order);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);
CREATE INDEX idx_queue_entries_created_at ON queue_entries(created_at);
CREATE INDEX idx_queue_members_member_id ON queue_members(member_id);
CREATE INDEX idx_queue_members_queue_entry_id ON queue_members(queue_entry_id);
CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);
CREATE INDEX idx_match_players_member_id ON match_players(member_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) 정책
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "courts_select" ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_entries_select" ON queue_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_members_select" ON queue_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_players_select" ON match_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "scores_select" ON scores FOR SELECT TO authenticated USING (true);

-- 본인 레코드 생성 (회원가입 시)
CREATE POLICY "members_insert_own" ON members FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- 본인 정보 수정
CREATE POLICY "members_update_own" ON members FOR UPDATE TO authenticated
  USING (auth_id = auth.uid());

-- 관리자 전체 수정/삽입/삭제 권한
CREATE POLICY "admin_members_all" ON members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));

CREATE POLICY "admin_courts_all" ON courts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));

-- 대기열 삽입/수정 (인증된 사용자)
CREATE POLICY "queue_entries_insert" ON queue_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_entries_update" ON queue_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_members_insert" ON queue_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_members_delete" ON queue_members FOR DELETE TO authenticated USING (true);

-- 시합 관련 (인증된 사용자)
CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "match_players_insert" ON match_players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "scores_insert" ON scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "scores_update" ON scores FOR UPDATE TO authenticated USING (true);

-- 익명 사용자(디스플레이)도 읽기 가능
CREATE POLICY "courts_select_anon" ON courts FOR SELECT TO anon USING (true);
CREATE POLICY "queue_entries_select_anon" ON queue_entries FOR SELECT TO anon USING (true);
CREATE POLICY "queue_members_select_anon" ON queue_members FOR SELECT TO anon USING (true);
CREATE POLICY "matches_select_anon" ON matches FOR SELECT TO anon USING (true);
CREATE POLICY "match_players_select_anon" ON match_players FOR SELECT TO anon USING (true);
CREATE POLICY "members_select_anon" ON members FOR SELECT TO anon USING (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE courts;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_members;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
