'use server';

import { createClient } from '@/lib/supabase/server';
import { getMyClubId } from './club-context';

/** 새 클럽 생성 (운영자 가입 시) */
export async function createClub(
  name: string,
  description: string | null,
  locations: { name: string; address: string; lat: number; lng: number }[]
) {
  if (!name.trim()) return { error: '클럽명을 입력해주세요.' };
  if (locations.length === 0) return { error: '활동 장소를 하나 이상 등록해주세요.' };

  const supabase = await createClient();

  // 현재 로그인한 사용자의 member 조회
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!member) return { error: '회원 정보를 찾을 수 없습니다.' };

  // 이미 클럽에 소속된 경우 확인
  const { data: existing } = await supabase
    .from('club_members')
    .select('id')
    .eq('member_id', member.id)
    .eq('status', 'approved')
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: '이미 소속된 클럽이 있습니다.' };
  }

  // 클럽 생성
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name: name.trim(), description })
    .select()
    .single();

  if (clubError || !club) return { error: clubError?.message ?? '클럽 생성에 실패했습니다.' };

  // 활동 장소 등록
  const locationRows = locations.map((loc, i) => ({
    club_id: club.id,
    name: loc.name,
    address: loc.address,
    lat: loc.lat,
    lng: loc.lng,
    is_primary: i === 0,
  }));

  await supabase.from('club_locations').insert(locationRows);

  // 생성자를 master로 등록
  await supabase.from('club_members').insert({
    club_id: club.id,
    member_id: member.id,
    role: 'master',
    status: 'approved',
  });

  // 기본 설정 생성
  await supabase.from('club_settings').insert({
    club_id: club.id,
    match_wait_seconds: 180,
  });

  return { data: club };
}

/** 클럽 정보 수정 */
export async function updateClub(name: string, description: string | null) {
  const clubId = await getMyClubId();
  if (!clubId) return { error: '클럽 정보를 찾을 수 없습니다.' };

  if (!name.trim()) return { error: '클럽명을 입력해주세요.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clubs')
    .update({ name: name.trim(), description })
    .eq('id', clubId);

  if (error) return { error: error.message };
  return { data: true };
}

/** 활동 장소 추가 */
export async function addClubLocation(
  name: string,
  address: string,
  lat: number,
  lng: number
) {
  const clubId = await getMyClubId();
  if (!clubId) return { error: '클럽 정보를 찾을 수 없습니다.' };

  if (!name.trim()) return { error: '장소명을 입력해주세요.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('club_locations')
    .insert({ club_id: clubId, name: name.trim(), address, lat, lng })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

/** 활동 장소 수정 */
export async function updateClubLocation(
  locationId: string,
  name: string,
  address: string,
  lat: number,
  lng: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_locations')
    .update({ name: name.trim(), address, lat, lng })
    .eq('id', locationId);

  if (error) return { error: error.message };
  return { data: true };
}

/** 활동 장소 삭제 */
export async function deleteClubLocation(locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_locations')
    .delete()
    .eq('id', locationId);

  if (error) return { error: error.message };
  return { data: true };
}

/** 클럽 검색 */
export async function searchClubs(query: string) {
  const supabase = await createClient();

  let q = supabase
    .from('clubs')
    .select('*, locations:club_locations(*)')
    .eq('is_active', true)
    .order('name');

  if (query.trim()) {
    q = q.ilike('name', `%${query.trim()}%`);
  }

  const { data, error } = await q.limit(20);
  if (error) return { error: error.message };

  // 각 클럽의 멤버 수 조회
  const clubIds = (data ?? []).map((c) => c.id);
  if (clubIds.length > 0) {
    const { data: counts } = await supabase
      .from('club_members')
      .select('club_id')
      .in('club_id', clubIds)
      .eq('status', 'approved');

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.club_id, (countMap.get(row.club_id) ?? 0) + 1);
    }

    const enriched = (data ?? []).map((club) => ({
      ...club,
      member_count: countMap.get(club.id) ?? 0,
    }));

    return { data: enriched };
  }

  return { data: data ?? [] };
}

/** 클럽 가입 요청 */
export async function requestJoinClub(clubId: string) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!member) return { error: '회원 정보를 찾을 수 없습니다.' };

  // 이미 소속/대기 중인 경우 확인
  const { data: existing } = await supabase
    .from('club_members')
    .select('id, status')
    .eq('member_id', member.id)
    .eq('club_id', clubId)
    .limit(1);

  if (existing && existing.length > 0) {
    const status = existing[0].status;
    if (status === 'approved') return { error: '이미 가입된 클럽입니다.' };
    if (status === 'pending') return { error: '가입 요청이 이미 접수되었습니다.' };
  }

  // 다른 클럽에 이미 소속된 경우
  const { data: otherClub } = await supabase
    .from('club_members')
    .select('id')
    .eq('member_id', member.id)
    .eq('status', 'approved')
    .limit(1);

  if (otherClub && otherClub.length > 0) {
    return { error: '이미 다른 클럽에 소속되어 있습니다.' };
  }

  const { error } = await supabase.from('club_members').insert({
    club_id: clubId,
    member_id: member.id,
    role: 'member',
    status: 'pending',
  });

  if (error) return { error: error.message };
  return { data: true };
}

/** 가입 요청 승인 */
export async function approveJoinRequest(clubMemberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'approved' })
    .eq('id', clubMemberId);

  if (error) return { error: error.message };
  return { data: true };
}

/** 가입 요청 거절 */
export async function rejectJoinRequest(clubMemberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'rejected' })
    .eq('id', clubMemberId);

  if (error) return { error: error.message };
  return { data: true };
}

/** 클럽 없이 시작하기 (pending 요청 없이 그냥 넘어감) */
export async function skipClubSelection() {
  // 아무 작업도 하지 않음 - 클럽 미소속 상태로 진행
  return { data: true };
}
