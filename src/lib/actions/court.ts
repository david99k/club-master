'use server';

import { createClient } from '@/lib/supabase/server';
import type { CourtStatus } from '@/types';

export async function createCourt(name: string) {
  const supabase = await createClient();

  // 현재 최대 display_order 가져오기
  const { data: courts } = await supabase
    .from('courts')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = courts && courts.length > 0 ? courts[0].display_order + 1 : 1;

  const { data, error } = await supabase
    .from('courts')
    .insert({ name, display_order: nextOrder })
    .select()
    .single();

  if (error) return { error: error.message };


  return { data };
}

export async function updateCourtStatus(courtId: string, status: CourtStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('courts')
    .update({ status })
    .eq('id', courtId);

  if (error) return { error: error.message };

  // 운영중으로 변경되면 대기 중인 팀 자동 배정 시도
  if (status === 'operating') {
    await autoAssignToAvailableCourt(courtId);
  }

  return { data: true };
}

async function autoAssignToAvailableCourt(courtId: string) {
  const supabase = await createClient();

  // 병렬: 활성 시합 확인 + 대기열 조회
  const [activeResult, entriesResult] = await Promise.all([
    supabase
      .from('matches')
      .select('id')
      .eq('court_id', courtId)
      .in('status', ['pending', 'playing'])
      .limit(1),
    supabase
      .from('queue_entries')
      .select('*, members:queue_members(member_id)')
      .eq('status', 'waiting')
      .order('created_at'),
  ]);

  if ((activeResult.data?.length ?? 0) > 0) return;

  const fullEntry = entriesResult.data?.find((e) => (e.members?.length ?? 0) >= 4);
  if (!fullEntry) return;

  // 병렬: 배정 + 시합 생성
  const [, matchResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .update({ status: 'assigned' })
      .eq('id', fullEntry.id),
    supabase
      .from('matches')
      .insert({
        court_id: courtId,
        queue_entry_id: fullEntry.id,
        status: 'pending',
      })
      .select()
      .single(),
  ]);

  const match = matchResult.data;
  if (match && fullEntry.members) {
    const players = fullEntry.members.map((m: { member_id: string }, i: number) => ({
      match_id: match.id,
      member_id: m.member_id,
      team: i < 2 ? 'A' : 'B',
    }));
    await supabase.from('match_players').insert(players);
  }
}

export async function updateCourtName(courtId: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('courts')
    .update({ name })
    .eq('id', courtId);

  if (error) return { error: error.message };


  return { data: true };
}

export async function deleteCourt(courtId: string) {
  const supabase = await createClient();

  // 진행 중인 시합이 있는지 확인
  const { data: activeMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('court_id', courtId)
    .in('status', ['pending', 'playing'])
    .limit(1);

  if (activeMatches && activeMatches.length > 0) {
    return { error: '진행 중인 시합이 있는 코트는 삭제할 수 없습니다.' };
  }

  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', courtId);

  if (error) return { error: error.message };


  return { data: true };
}

export async function reorderCourts(courtIds: string[]) {
  const supabase = await createClient();

  const updates = courtIds.map((id, index) =>
    supabase
      .from('courts')
      .update({ display_order: index + 1 })
      .eq('id', id)
  );

  await Promise.all(updates);


  return { data: true };
}
