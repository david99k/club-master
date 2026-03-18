'use server';

import { createClient } from '@/lib/supabase/server';


export async function createRoundRobin(selectedMemberIds: string[]) {
  const supabase = await createClient();

  if (selectedMemberIds.length < 4) {
    return { error: '최소 4명이 필요합니다.' };
  }

  // 4명씩 그룹으로 나누기 (셔플 후)
  const shuffled = [...selectedMemberIds].sort(() => Math.random() - 0.5);
  const groups: string[][] = [];

  for (let i = 0; i < shuffled.length; i += 4) {
    const group = shuffled.slice(i, i + 4);
    if (group.length >= 2) {
      groups.push(group);
    }
  }

  // 남은 인원이 2~3명이면 마지막 그룹에 합치기 (4명 미만 그룹 방지)
  if (groups.length > 1) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup.length < 4) {
      // 마지막 그룹이 4명 미만이면 이전 그룹과 합쳐서 재분배하지 않고 그대로 대기열에 넣기
      // (2~3명도 대기 가능)
    }
  }

  // 운영 중인 코트 목록
  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('status', 'operating')
    .order('display_order');

  const courtIds = courts?.map((c) => c.id) ?? [];

  // 각 그룹을 대기열에 추가
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const courtPreferenceId = courtIds[i % courtIds.length] ?? null;

    const { data: entry } = await supabase
      .from('queue_entries')
      .insert({
        court_preference_id: courtPreferenceId,
        status: 'waiting',
      })
      .select()
      .single();

    if (!entry) continue;

    const queueMembers = group.map((memberId, idx) => ({
      queue_entry_id: entry.id,
      member_id: memberId,
      is_creator: idx === 0,
    }));

    await supabase.from('queue_members').insert(queueMembers);

    // 4명 완성팀은 빈 코트에 자동 배정 시도
    if (group.length >= 4 && courtPreferenceId) {
      const { data: activeMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('court_id', courtPreferenceId)
        .in('status', ['pending', 'playing'])
        .limit(1);

      if (!activeMatch || activeMatch.length === 0) {
        await supabase
          .from('queue_entries')
          .update({ status: 'assigned' })
          .eq('id', entry.id);

        const { data: match } = await supabase
          .from('matches')
          .insert({
            court_id: courtPreferenceId,
            queue_entry_id: entry.id,
            status: 'pending',
          })
          .select()
          .single();

        if (match) {
          const players = group.map((memberId, idx) => ({
            match_id: match.id,
            member_id: memberId,
            team: idx < 2 ? 'A' : 'B',
          }));
          await supabase.from('match_players').insert(players);
        }
      }
    }
  }


  return { data: { groupCount: groups.length, totalPlayers: selectedMemberIds.length } };
}
