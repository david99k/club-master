'use server';

import { createClient } from '@/lib/supabase/server';
import { getMyClubId } from './club-context';


export async function joinQueue(
  memberIds: string[],
  courtPreferenceId?: string | null
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const clubId = await getMyClubId();
  if (!clubId) return { error: '클럽 정보를 찾을 수 없습니다.' };

  const { data: currentMember } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentMember) return { error: '회원 정보를 찾을 수 없습니다.' };

  const [busyResult, existingResult] = await Promise.all([
    supabase
      .from('match_players')
      .select('id, matches!inner(status)')
      .eq('member_id', currentMember.id)
      .in('matches.status', ['pending', 'playing'])
      .limit(1),
    supabase
      .from('queue_members')
      .select('queue_entry_id, queue_entries!inner(status)')
      .eq('member_id', currentMember.id)
      .in('queue_entries.status', ['waiting', 'assigned', 'playing'])
      .limit(1),
  ]);

  const isMeBusy = (busyResult.data?.length ?? 0) > 0;

  if (!isMeBusy && (existingResult.data?.length ?? 0) > 0) {
    return { error: '이미 대기열에 참여 중입니다.' };
  }

  if (isMeBusy && memberIds.length === 0) {
    return { error: '대기열에 추가할 멤버를 선택해주세요.' };
  }

  const allMemberIds = isMeBusy
    ? memberIds
    : [currentMember.id, ...memberIds.filter(id => id !== currentMember.id)];

  const creatorId = isMeBusy ? allMemberIds[0] : currentMember.id;

  const { data: entry, error: entryError } = await supabase
    .from('queue_entries')
    .insert({
      court_preference_id: courtPreferenceId || null,
      status: 'waiting',
      club_id: clubId,
    })
    .select()
    .single();

  if (entryError) return { error: entryError.message };

  const queueMembers = allMemberIds.map((memberId) => ({
    queue_entry_id: entry.id,
    member_id: memberId,
    is_creator: memberId === creatorId,
  }));

  const { error: memberError } = await supabase
    .from('queue_members')
    .insert(queueMembers);

  if (memberError) return { error: memberError.message };

  if (allMemberIds.length >= 4) {
    await tryAssignCourt(entry.id, clubId);
  }

  return { data: entry };
}

export async function joinExistingQueue(queueEntryId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const { data: currentMember } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentMember) return { error: '회원 정보를 찾을 수 없습니다.' };

  const [existingResult, membersResult] = await Promise.all([
    supabase
      .from('queue_members')
      .select('queue_entry_id, queue_entries!inner(status)')
      .eq('member_id', currentMember.id)
      .in('queue_entries.status', ['waiting', 'assigned', 'playing'])
      .limit(1),
    supabase
      .from('queue_members')
      .select('id')
      .eq('queue_entry_id', queueEntryId),
  ]);

  if ((existingResult.data?.length ?? 0) > 0) {
    return { error: '이미 대기열에 참여 중입니다.' };
  }

  const memberCount = membersResult.data?.length ?? 0;
  if (memberCount >= 4) {
    return { error: '이미 4명이 모두 찼습니다.' };
  }

  const { error } = await supabase
    .from('queue_members')
    .insert({
      queue_entry_id: queueEntryId,
      member_id: currentMember.id,
      is_creator: false,
    });

  if (error) return { error: error.message };

  if (memberCount + 1 >= 4) {
    // queue_entry에서 club_id 조회
    const { data: entry } = await supabase
      .from('queue_entries')
      .select('club_id')
      .eq('id', queueEntryId)
      .single();
    if (entry) {
      await tryAssignCourt(queueEntryId, entry.club_id);
    }
  }

  return { data: true };
}

export async function cancelQueue(queueEntryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('queue_entries')
    .update({ status: 'cancelled' })
    .eq('id', queueEntryId);

  if (error) return { error: error.message };
  return { data: true };
}

export async function leaveQueue(queueEntryId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const { data: currentMember } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentMember) return { error: '회원 정보를 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('queue_members')
    .delete()
    .eq('queue_entry_id', queueEntryId)
    .eq('member_id', currentMember.id);

  if (error) return { error: error.message };
  return { data: true };
}

export async function addMembersToQueue(queueEntryId: string, memberIds: string[]) {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('queue_members')
    .select('member_id')
    .eq('queue_entry_id', queueEntryId);

  const currentCount = current?.length ?? 0;
  if (currentCount + memberIds.length > 4) {
    return { error: `최대 4명까지 가능합니다. (현재 ${currentCount}명)` };
  }

  const existingIds = current?.map((m) => m.member_id) ?? [];
  const newIds = memberIds.filter((id) => !existingIds.includes(id));

  if (newIds.length === 0) {
    return { error: '추가할 멤버가 없습니다.' };
  }

  const rows = newIds.map((memberId) => ({
    queue_entry_id: queueEntryId,
    member_id: memberId,
    is_creator: false,
  }));

  const { error } = await supabase.from('queue_members').insert(rows);
  if (error) return { error: error.message };

  if (currentCount + newIds.length >= 4) {
    const { data: entry } = await supabase
      .from('queue_entries')
      .select('club_id')
      .eq('id', queueEntryId)
      .single();
    if (entry) {
      await tryAssignCourt(queueEntryId, entry.club_id);
    }
  }

  return { data: true };
}

async function tryAssignCourt(queueEntryId: string, clubId: string) {
  const supabase = await createClient();

  const [entryResult, courtsResult, activeMatchesResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('*, members:queue_members(member_id)')
      .eq('id', queueEntryId)
      .single(),
    supabase
      .from('courts')
      .select('id')
      .eq('club_id', clubId)
      .eq('status', 'operating')
      .order('display_order'),
    supabase
      .from('matches')
      .select('court_id')
      .eq('club_id', clubId)
      .in('status', ['pending', 'playing']),
  ]);

  const entry = entryResult.data;
  if (!entry || entry.status !== 'waiting') return;

  const courts = courtsResult.data ?? [];
  const busyCourtIds = new Set(
    (activeMatchesResult.data ?? []).map((m) => m.court_id)
  );

  let courtId: string | null = null;

  if (entry.court_preference_id && !busyCourtIds.has(entry.court_preference_id)) {
    const isOperating = courts.some((c) => c.id === entry.court_preference_id);
    if (isOperating) courtId = entry.court_preference_id;
  }

  if (!courtId) {
    const available = courts.find((c) => !busyCourtIds.has(c.id));
    if (available) courtId = available.id;
  }

  if (!courtId) return;

  const [, matchResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .update({ status: 'assigned' })
      .eq('id', queueEntryId),
    supabase
      .from('matches')
      .insert({
        court_id: courtId,
        queue_entry_id: queueEntryId,
        status: 'pending',
        club_id: clubId,
      })
      .select()
      .single(),
  ]);

  const match = matchResult.data;
  if (!match) return;

  const members = entry.members as { member_id: string }[];
  const players = members.map((m, i) => ({
    match_id: match.id,
    member_id: m.member_id,
    team: i < 2 ? 'A' : 'B',
  }));

  await supabase.from('match_players').insert(players);
}
