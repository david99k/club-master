-- ============================================
-- 경기 기록 보존 + 경기 삭제 권한
-- ============================================

-- 1) match_players에 player_name 컬럼 추가 (회원 삭제 후에도 이름 보존)
ALTER TABLE match_players ADD COLUMN player_name TEXT;

-- 2) 기존 데이터 백필: 현재 회원 이름을 player_name에 저장
UPDATE match_players mp
SET player_name = m.name
FROM members m
WHERE mp.member_id = m.id;

-- 3) member_id를 nullable로 변경 + ON DELETE SET NULL
ALTER TABLE match_players ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE match_players
  DROP CONSTRAINT match_players_member_id_fkey,
  ADD CONSTRAINT match_players_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

-- 4) UNIQUE 제약 재설정 (member_id가 NULL일 수 있으므로 partial unique index 사용)
ALTER TABLE match_players DROP CONSTRAINT match_players_match_id_member_id_key;
CREATE UNIQUE INDEX match_players_match_id_member_id_unique
  ON match_players (match_id, member_id) WHERE member_id IS NOT NULL;

-- 5) 경기 삭제 RLS 정책 (관리자만)
CREATE POLICY "admin_matches_delete" ON matches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));

CREATE POLICY "admin_match_players_delete" ON match_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));

CREATE POLICY "admin_scores_delete" ON scores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE auth_id = auth.uid() AND role IN ('admin', 'sub_admin')));
