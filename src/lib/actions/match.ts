'use server';

import { createClient } from '@/lib/supabase/server';

// 3가지 팀 조합을 순환: (0,1 vs 2,3) → (0,2 vs 1,3) → (0,3 vs 1,2) → ...
export async function cycleTeams(matchId: string) {
  const supabase = await createClient();

  const [{ data: match }, { data: players }] = await Promise.all([
    supabase.from('matches').select('status').eq('id', matchId).single(),
    supabase.from('match_players').select('id, member_id, team').eq('match_id', matchId),
  ]);

  if (!match || match.status !== 'pending') {
    return { error: '대기 중인 경기만 팀 변경이 가능합니다.' };
  }

  if (!players || players.length !== 4) {
    return { error: '4명의 플레이어가 필요합니다.' };
  }

  const sorted = [...players].sort((a, b) => (a.member_id ?? '').localeCompare(b.member_id ?? ''));

  const teamAIds = new Set(players.filter((p) => p.team === 'A').map((p) => p.member_id));

  const partnerIndex = sorted.findIndex(
    (p, i) => i > 0 && teamAIds.has(p.member_id) === teamAIds.has(sorted[0].member_id)
  );

  const comboMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
  const currentCombo = comboMap[partnerIndex] ?? 0;
  const nextCombo = (currentCombo + 1) % 3;

  const combos = [
    { A: [0, 1], B: [2, 3] },
    { A: [0, 2], B: [1, 3] },
    { A: [0, 3], B: [1, 2] },
  ];
  const next = combos[nextCombo];

  await Promise.all([
    ...next.A.map((i) =>
      supabase.from('match_players').update({ team: 'A' }).eq('id', sorted[i].id)
    ),
    ...next.B.map((i) =>
      supabase.from('match_players').update({ team: 'B' }).eq('id', sorted[i].id)
    ),
  ]);

  return { data: true };
}

export async function startMatch(matchId: string) {
  const supabase = await createClient();

  const [updateResult, matchResult] = await Promise.all([
    supabase
      .from('matches')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('id', matchId),
    supabase
      .from('matches')
      .select('queue_entry_id')
      .eq('id', matchId)
      .single(),
  ]);

  if (updateResult.error) return { error: updateResult.error.message };

  if (matchResult.data?.queue_entry_id) {
    await supabase
      .from('queue_entries')
      .update({ status: 'playing' })
      .eq('id', matchResult.data.queue_entry_id);
  }

  return { data: true };
}

export async function completeMatch(
  matchId: string,
  teamAScore?: number,
  teamBScore?: number
) {
  const supabase = await createClient();

  // 경기 완료 시 player_name 보존
  const { data: playersToSave } = await supabase
    .from('match_players')
    .select('id, member_id')
    .eq('match_id', matchId)
    .is('player_name', null);

  if (playersToSave && playersToSave.length > 0) {
    const memberIds = playersToSave.map((p) => p.member_id).filter(Boolean) as string[];
    if (memberIds.length > 0) {
      const { data: memberNames } = await supabase
        .from('members')
        .select('id, name')
        .in('id', memberIds);
      const nameMap = new Map((memberNames ?? []).map((m) => [m.id, m.name]));
      await Promise.all(
        playersToSave
          .filter((p) => p.member_id && nameMap.has(p.member_id))
          .map((p) =>
            supabase
              .from('match_players')
              .update({ player_name: nameMap.get(p.member_id!)! })
              .eq('id', p.id)
          )
      );
    }
  }

  // 병렬: 시합 완료 + queue_entry_id + club_id 조회
  const [updateResult, matchResult] = await Promise.all([
    supabase
      .from('matches')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', matchId),
    supabase
      .from('matches')
      .select('queue_entry_id, club_id')
      .eq('id', matchId)
      .single(),
  ]);

  if (updateResult.error) return { error: updateResult.error.message };

  if (matchResult.data?.queue_entry_id) {
    if (teamAScore !== undefined && teamBScore !== undefined) {
      await Promise.all([
        supabase
          .from('queue_entries')
          .update({ status: 'completed' })
          .eq('id', matchResult.data.queue_entry_id),
        supabase.from('scores').insert({
          match_id: matchId,
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        }),
      ]);
    } else {
      await supabase
        .from('queue_entries')
        .update({ status: 'completed' })
        .eq('id', matchResult.data.queue_entry_id);
    }
  } else if (teamAScore !== undefined && teamBScore !== undefined) {
    await supabase.from('scores').insert({
      match_id: matchId,
      team_a_score: teamAScore,
      team_b_score: teamBScore,
    });
  }

  // 대기 중인 팀을 빈 코트에 자동 배정
  if (matchResult.data?.club_id) {
    await autoAssignWaitingTeams(matchResult.data.club_id);
  }

  return { data: true };
}

export async function deleteMatch(matchId: string) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: '로그인이 필요합니다.' };

  const { data: currentMember } = await supabase
    .from('members')
    .select('id, is_super_admin')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentMember) return { error: '회원 정보를 찾을 수 없습니다.' };

  // 슈퍼 어드민이 아니면 클럽 역할 확인
  if (!currentMember.is_super_admin) {
    const { data: match } = await supabase
      .from('matches')
      .select('club_id')
      .eq('id', matchId)
      .single();

    if (!match) return { error: '경기를 찾을 수 없습니다.' };

    const { data: membership } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', match.club_id)
      .eq('member_id', currentMember.id)
      .single();

    if (!membership || !['master', 'admin'].includes(membership.role)) {
      return { error: '경기 기록 삭제 권한이 없습니다.' };
    }
  }

  const { data: match } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single();

  if (!match) return { error: '경기를 찾을 수 없습니다.' };
  if (match.status !== 'completed') {
    return { error: '완료된 경기만 삭제할 수 있습니다.' };
  }

  await Promise.all([
    supabase.from('scores').delete().eq('match_id', matchId),
    supabase.from('match_players').delete().eq('match_id', matchId),
  ]);

  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) return { error: error.message };

  return { data: true };
}

async function autoAssignWaitingTeams(clubId: string) {
  const supabase = await createClient();

  const [entriesResult, courtsResult, activeResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('*, members:queue_members(member_id)')
      .eq('club_id', clubId)
      .eq('status', 'waiting')
      .order('created_at'),
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

  const waitingEntries = entriesResult.data;
  if (!waitingEntries) return;

  const courts = courtsResult.data ?? [];
  const busyCourtIds = new Set(
    (activeResult.data ?? []).map((m) => m.court_id)
  );

  const fullEntries = waitingEntries.filter((e) => (e.members?.length ?? 0) >= 4);

  for (const entry of fullEntries) {
    let courtId: string | null = null;

    if (entry.court_preference_id && !busyCourtIds.has(entry.court_preference_id)) {
      if (courts.some((c) => c.id === entry.court_preference_id)) {
        courtId = entry.court_preference_id;
      }
    }

    if (!courtId) {
      const available = courts.find((c) => !busyCourtIds.has(c.id));
      if (available) courtId = available.id;
    }

    if (!courtId) break;

    busyCourtIds.add(courtId);

    const [, matchResult] = await Promise.all([
      supabase
        .from('queue_entries')
        .update({ status: 'assigned' })
        .eq('id', entry.id),
      supabase
        .from('matches')
        .insert({
          court_id: courtId,
          queue_entry_id: entry.id,
          status: 'pending',
          club_id: clubId,
        })
        .select()
        .single(),
    ]);

    const match = matchResult.data;
    if (match && entry.members) {
      const players = entry.members.map((m: { member_id: string }, i: number) => ({
        match_id: match.id,
        member_id: m.member_id,
        team: i < 2 ? 'A' : 'B',
      }));
      await supabase.from('match_players').insert(players);
    }
  }
}
