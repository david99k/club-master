'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCourtStore } from '@/store/court';
import { useQueueStore } from '@/store/queue';
import { useMatchStore } from '@/store/match';
import type { Court, QueueEntry, QueueMember, Member, Match, MatchPlayer, Score } from '@/types';

export function useRealtimeCourts() {
  const { setCourts, updateCourt } = useCourtStore();

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('courts')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        if (data) setCourts(data as readonly Court[]);
      });

    const channel = supabase
      .channel('courts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            updateCourt(payload.new.id, payload.new as Court);
          } else {
            supabase
              .from('courts')
              .select('*')
              .order('display_order')
              .then(({ data }) => {
                if (data) setCourts(data as readonly Court[]);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setCourts, updateCourt]);
}

export function useRealtimeQueue() {
  const { setEntries } = useQueueStore();

  useEffect(() => {
    const supabase = createClient();

    const loadQueue = async () => {
      // 개별 쿼리로 데이터 조회
      const { data: entries } = await supabase
        .from('queue_entries')
        .select('*')
        .in('status', ['waiting', 'assigned'])
        .order('created_at');

      if (!entries || entries.length === 0) {
        setEntries([]);
        return;
      }

      const entryIds = entries.map((e) => e.id);

      const [{ data: queueMembers }, { data: courts }] = await Promise.all([
        supabase
          .from('queue_members')
          .select('*')
          .in('queue_entry_id', entryIds),
        supabase
          .from('courts')
          .select('*'),
      ]);

      const memberIds = (queueMembers ?? []).map((qm) => qm.member_id);
      const { data: members } = memberIds.length > 0
        ? await supabase.from('members').select('*').in('id', memberIds)
        : { data: [] as Member[] };

      const membersMap = new Map((members ?? []).map((m) => [m.id, m]));
      const courtsMap = new Map((courts ?? []).map((c) => [c.id, c]));

      const result: QueueEntry[] = entries.map((entry) => ({
        ...entry,
        preferred_court: entry.court_preference_id
          ? courtsMap.get(entry.court_preference_id) ?? null
          : null,
        members: (queueMembers ?? [])
          .filter((qm) => qm.queue_entry_id === entry.id)
          .map((qm) => ({
            ...qm,
            member: membersMap.get(qm.member_id),
          })) as readonly QueueMember[],
      }));

      setEntries(result as readonly QueueEntry[]);
    };

    loadQueue();

    const channel = supabase
      .channel('queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => loadQueue()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_members' },
        () => loadQueue()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setEntries]);
}

export function useRealtimeMatches() {
  const { setMatches } = useMatchStore();

  useEffect(() => {
    const supabase = createClient();

    const loadMatches = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['pending', 'playing'])
        .order('created_at');

      if (!matches || matches.length === 0) {
        setMatches([]);
        return;
      }

      const matchIds = matches.map((m) => m.id);
      const courtIds = matches.map((m) => m.court_id);

      const [{ data: players }, { data: scores }, { data: courts }] = await Promise.all([
        supabase
          .from('match_players')
          .select('*')
          .in('match_id', matchIds),
        supabase
          .from('scores')
          .select('*')
          .in('match_id', matchIds),
        supabase
          .from('courts')
          .select('*')
          .in('id', courtIds),
      ]);

      const memberIds = (players ?? []).map((p) => p.member_id);
      const { data: members } = memberIds.length > 0
        ? await supabase.from('members').select('*').in('id', memberIds)
        : { data: [] as Member[] };

      const membersMap = new Map((members ?? []).map((m) => [m.id, m]));
      const courtsMap = new Map((courts ?? []).map((c) => [c.id, c]));
      const scoresMap = new Map((scores ?? []).map((s) => [s.match_id, s]));

      const result: Match[] = matches.map((match) => ({
        ...match,
        court: courtsMap.get(match.court_id),
        players: (players ?? [])
          .filter((p) => p.match_id === match.id)
          .map((p) => ({
            ...p,
            member: membersMap.get(p.member_id),
          })) as readonly MatchPlayer[],
        score: scoresMap.get(match.id) ?? null,
      }));

      setMatches(result as readonly Match[]);
    };

    loadMatches();

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_players' },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        () => loadMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMatches]);
}
