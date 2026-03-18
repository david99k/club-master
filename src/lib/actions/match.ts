'use server';

import { createClient } from '@/lib/supabase/server';


export async function startMatch(matchId: string) {
  const supabase = await createClient();

  // 병렬: 시합 시작 + queue_entry_id 조회
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

  // 병렬: 시합 완료 + queue_entry_id 조회
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
      .select('queue_entry_id')
      .eq('id', matchId)
      .single(),
  ]);

  if (updateResult.error) return { error: updateResult.error.message };

  // 병렬: 대기열 완료 + 스코어 입력
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
  await autoAssignWaitingTeams();

  return { data: true };
}

async function autoAssignWaitingTeams() {
  const supabase = await createClient();

  // 병렬: 대기열 + 운영 코트 + 활성 시합
  const [entriesResult, courtsResult, activeResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('*, members:queue_members(member_id)')
      .eq('status', 'waiting')
      .order('created_at'),
    supabase
      .from('courts')
      .select('id')
      .eq('status', 'operating')
      .order('display_order'),
    supabase
      .from('matches')
      .select('court_id')
      .in('status', ['pending', 'playing']),
  ]);

  const waitingEntries = entriesResult.data;
  if (!waitingEntries) return;

  const courts = courtsResult.data ?? [];
  const busyCourtIds = new Set(
    (activeResult.data ?? []).map((m) => m.court_id)
  );

  // 4인 완성팀만, 생성 순서대로
  const fullEntries = waitingEntries.filter((e) => (e.members?.length ?? 0) >= 4);

  for (const entry of fullEntries) {
    let courtId: string | null = null;

    // 선호 코트 우선
    if (entry.court_preference_id && !busyCourtIds.has(entry.court_preference_id)) {
      if (courts.some((c) => c.id === entry.court_preference_id)) {
        courtId = entry.court_preference_id;
      }
    }

    if (!courtId) {
      const available = courts.find((c) => !busyCourtIds.has(c.id));
      if (available) courtId = available.id;
    }

    if (!courtId) break; // 빈 코트 없음

    // 배정된 코트를 busyCourtIds에 추가 (다음 루프에서 중복 방지)
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
