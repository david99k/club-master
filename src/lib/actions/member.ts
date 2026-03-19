'use server';

import { createClient } from '@/lib/supabase/server';
import { getMyClubId } from './club-context';

export async function addMember(name: string, phone?: string) {
  const supabase = await createClient();
  const clubId = await getMyClubId();

  const { data, error } = await supabase
    .from('members')
    .insert({
      name,
      phone: phone || null,
      role: 'user',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // 클럽에 회원 추가
  if (data && clubId) {
    await supabase.from('club_members').insert({
      club_id: clubId,
      member_id: data.id,
      role: 'member',
      status: 'approved',
    });
  }

  return { data };
}

export async function deleteMember(memberId: string) {
  const supabase = await createClient();

  const [{ data: activePlayers }, { data: memberData }] = await Promise.all([
    supabase
      .from('match_players')
      .select('id, match:matches!inner(status)')
      .eq('member_id', memberId)
      .in('matches.status', ['pending', 'playing'])
      .limit(1),
    supabase
      .from('members')
      .select('name')
      .eq('id', memberId)
      .single(),
  ]);

  if (activePlayers && activePlayers.length > 0) {
    return { error: '진행 중인 시합에 참여 중인 회원은 삭제할 수 없습니다.' };
  }

  // 삭제 전: 경기 기록에 이름 보존
  if (memberData?.name) {
    await supabase
      .from('match_players')
      .update({ player_name: memberData.name })
      .eq('member_id', memberId)
      .is('player_name', null);
  }

  // 대기열에서 제거 후 회원 삭제
  await supabase
    .from('queue_members')
    .delete()
    .eq('member_id', memberId);

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) return { error: error.message };
  return { data: true };
}
