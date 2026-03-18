-- ============================================
-- 클럽 설정 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS club_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_wait_seconds INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기본 설정 삽입
INSERT INTO club_settings (match_wait_seconds) VALUES (120);

-- updated_at 트리거
CREATE TRIGGER club_settings_updated_at
  BEFORE UPDATE ON club_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON club_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_select_anon" ON club_settings FOR SELECT TO anon USING (true);
CREATE POLICY "admin_settings_all" ON club_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE club_settings;

-- match_players UPDATE 정책 (팀 변경용)
CREATE POLICY "match_players_update" ON match_players FOR UPDATE TO authenticated USING (true);
