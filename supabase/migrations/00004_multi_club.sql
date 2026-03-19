-- ============================================
-- 멀티 클럽 시스템
-- ============================================

-- 1) clubs 테이블
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) club_locations 테이블 (클럽당 여러 활동 장소)
CREATE TABLE club_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) club_members 테이블 (클럽-회원 다대다)
CREATE TABLE club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('master', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, member_id)
);

-- 4) 기존 테이블에 club_id 추가
ALTER TABLE courts ADD COLUMN club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE queue_entries ADD COLUMN club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE matches ADD COLUMN club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE club_settings ADD COLUMN club_id UUID UNIQUE REFERENCES clubs(id) ON DELETE CASCADE;

-- 5) members에 is_super_admin 추가
ALTER TABLE members ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- 6) 기존 데이터 마이그레이션: 기본 클럽 생성
DO $$
DECLARE
  default_club_id UUID;
  master_member_id UUID;
BEGIN
  -- 첫 번째 admin을 마스터로 설정
  SELECT id INTO master_member_id FROM members WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  -- admin이 없으면 아무 멤버나
  IF master_member_id IS NULL THEN
    SELECT id INTO master_member_id FROM members ORDER BY created_at LIMIT 1;
  END IF;

  -- 멤버가 하나도 없으면 스킵
  IF master_member_id IS NULL THEN
    RETURN;
  END IF;

  -- 기본 클럽 생성
  INSERT INTO clubs (name) VALUES ('Default Club') RETURNING id INTO default_club_id;

  -- 기존 데이터에 club_id 설정
  UPDATE courts SET club_id = default_club_id;
  UPDATE queue_entries SET club_id = default_club_id;
  UPDATE matches SET club_id = default_club_id;
  UPDATE club_settings SET club_id = default_club_id;

  -- 모든 기존 멤버를 기본 클럽에 추가
  INSERT INTO club_members (club_id, member_id, role, status)
  SELECT
    default_club_id,
    id,
    CASE
      WHEN role = 'admin' THEN 'master'
      WHEN role = 'sub_admin' THEN 'admin'
      ELSE 'member'
    END,
    'approved'
  FROM members;

  -- 첫 번째 admin을 super admin으로
  UPDATE members SET is_super_admin = true WHERE id = master_member_id;

  -- 기본 활동 장소 (서울 기본 좌표)
  INSERT INTO club_locations (club_id, name, lat, lng, is_primary)
  VALUES (default_club_id, '기본 활동장소', 37.5665, 126.9780, true);
END $$;

-- 7) club_id NOT NULL 설정 (데이터 백필 후)
ALTER TABLE courts ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE queue_entries ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE matches ALTER COLUMN club_id SET NOT NULL;

-- 8) 인덱스
CREATE INDEX idx_clubs_is_active ON clubs(is_active);
CREATE INDEX idx_club_locations_club_id ON club_locations(club_id);
CREATE INDEX idx_club_locations_lat_lng ON club_locations(lat, lng);
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_member_id ON club_members(member_id);
CREATE INDEX idx_club_members_status ON club_members(status);
CREATE INDEX idx_courts_club_id ON courts(club_id);
CREATE INDEX idx_queue_entries_club_id ON queue_entries(club_id);
CREATE INDEX idx_matches_club_id ON matches(club_id);

-- 9) 트리거
CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER club_locations_updated_at BEFORE UPDATE ON club_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER club_members_updated_at BEFORE UPDATE ON club_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10) RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- clubs: 모두 읽기 가능 (클럽 탐색), 마스터/어드민만 수정
CREATE POLICY "clubs_select" ON clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "clubs_select_anon" ON clubs FOR SELECT TO anon USING (true);
CREATE POLICY "clubs_insert" ON clubs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clubs_update" ON clubs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  ));

-- club_locations: 모두 읽기, 클럽 마스터/어드민만 수정
CREATE POLICY "club_locations_select" ON club_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_locations_select_anon" ON club_locations FOR SELECT TO anon USING (true);
CREATE POLICY "club_locations_insert" ON club_locations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  )
);
CREATE POLICY "club_locations_update" ON club_locations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  ));
CREATE POLICY "club_locations_delete" ON club_locations FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  ));

-- club_members: 본인 멤버십 읽기 + 같은 클럽 멤버 읽기 + 마스터/어드민 관리
CREATE POLICY "club_members_select" ON club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_members_insert" ON club_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "club_members_update" ON club_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  ));
CREATE POLICY "club_members_delete" ON club_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_id AND cm.member_id = (SELECT m.id FROM members m WHERE m.auth_id = auth.uid())
    AND cm.role IN ('master', 'admin')
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clubs;
ALTER PUBLICATION supabase_realtime ADD TABLE club_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE club_members;
