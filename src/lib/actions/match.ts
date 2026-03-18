'use server';

import { createClient } from '@/lib/supabase/server';


export async function startMatch(matchId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'playing',
      started_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (error) return { error: error.message };

  // 대기열 상태도 업데이트
  const { data: match } = await supabase
    .from('matches')
    .select('queue_entry_id')
    .eq('id', matchId)
    .single();

  if (match?.queue_entry_id) {
    await supabase
      .from('queue_entries')
      .update({ status: 'playing' })
      .eq('id', match.queue_entry_id);
  }


  return { data: true };
}

export async function completeMatch(
  matchId: string,
  teamAScore?: number,
  teamBScore?: number
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (error) return { error: error.message };

  // 대기열 상태 업데이트
  const { data: match } = await supabase
    .from('matches')
    .select('queue_entry_id')
    .eq('id', matchId)
    .single();

  if (match?.queue_entry_id) {
    await supabase
      .from('queue_entries')
      .update({ status: 'completed' })
      .eq('id', match.queue_entry_id);
  }

  // 스코어 입력 (선택)
  if (teamAScore !== undefined && teamBScore !== undefined) {
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

  // 4인 완성 대기팀 우선 -> 생성 순서대로
  const { data: waitingEntries } = await supabase
    .from('queue_entries')
    .select(`
      *,
      members:queue_members(member_id)
    `)
    .eq('status', 'waiting')
    .order('created_at');

  if (!waitingEntries) return;

  // 4인 완성팀 우선 정렬
  const sorted = [...waitingEntries].sort((a, b) => {
    const aFull = (a.members?.length ?? 0) >= 4 ? 0 : 1;
    const bFull = (b.members?.length ?? 0) >= 4 ? 0 : 1;
    return aFull - bFull;
  });

  for (const entry of sorted) {
    if ((entry.members?.length ?? 0) < 4) continue;

    // 빈 코트 찾기 (선호 코트 우선)
    let courtId: string | null = null;

    if (entry.court_preference_id) {
      const { data: activeMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('court_id', entry.court_preference_id)
        .in('status', ['pending', 'playing'])
        .limit(1);

      if (!activeMatch || activeMatch.length === 0) {
        // 코트가 운영 중인지 확인
        const { data: court } = await supabase
          .from('courts')
          .select('id')
          .eq('id', entry.court_preference_id)
          .eq('status', 'operating')
          .single();

        if (court) courtId = court.id;
      }
    }

    if (!courtId) {
      const { data: courts } = await supabase
        .from('courts')
        .select('id')
        .eq('status', 'operating')
        .order('display_order');

      if (courts) {
        for (const court of courts) {
          const { data: activeMatch } = await supabase
            .from('matches')
            .select('id')
            .eq('court_id', court.id)
            .in('status', ['pending', 'playing'])
            .limit(1);

          if (!activeMatch || activeMatch.length === 0) {
            courtId = court.id;
            break;
          }
        }
      }
    }

    if (!courtId) break; // 빈 코트 없음

    // 배정
    await supabase
      .from('queue_entries')
      .update({ status: 'assigned' })
      .eq('id', entry.id);

    const { data: match } = await supabase
      .from('matches')
      .insert({
        court_id: courtId,
        queue_entry_id: entry.id,
        status: 'pending',
      })
      .select()
      .single();

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
