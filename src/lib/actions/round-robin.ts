'use server';

import { createClient } from '@/lib/supabase/server';
import { getMyClubId } from './club-context';


export async function createRoundRobin(selectedMemberIds: string[]) {
  const supabase = await createClient();
  const clubId = await getMyClubId();
  if (!clubId) return { error: '클럽 정보를 찾을 수 없습니다.' };

  if (selectedMemberIds.length < 4) {
    return { error: '최소 4명이 필요합니다.' };
  }

  const shuffled = [...selectedMemberIds].sort(() => Math.random() - 0.5);
  const groups: string[][] = [];

  for (let i = 0; i < shuffled.length; i += 4) {
    const group = shuffled.slice(i, i + 4);
    if (group.length >= 2) {
      groups.push(group);
    }
  }

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('club_id', clubId)
    .eq('status', 'operating')
    .order('display_order');

  const courtIds = courts?.map((c) => c.id) ?? [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const courtPreferenceId = courtIds[i % courtIds.length] ?? null;

    const { data: entry } = await supabase
      .from('queue_entries')
      .insert({
        court_preference_id: courtPreferenceId,
        status: 'waiting',
        club_id: clubId,
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
            club_id: clubId,
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
