'use server';

import { createClient } from '@/lib/supabase/server';

export async function addMember(name: string, phone?: string) {
  const supabase = await createClient();

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
  return { data };
}

export async function deleteMember(memberId: string) {
  const supabase = await createClient();

  // 진행 중인 시합에 참여 중인지 확인
  const { data: activePlayers } = await supabase
    .from('match_players')
    .select('id, match:matches!inner(status)')
    .eq('member_id', memberId)
    .in('matches.status', ['pending', 'playing'])
    .limit(1);

  if (activePlayers && activePlayers.length > 0) {
    return { error: '진행 중인 시합에 참여 중인 회원은 삭제할 수 없습니다.' };
  }

  // 대기열에 있는지 확인 후 제거
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
