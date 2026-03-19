'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCourtStore } from '@/store/court';
import { useQueueStore } from '@/store/queue';
import { useMatchStore } from '@/store/match';
import { useSettingsStore } from '@/store/settings';
import { useClubStore } from '@/store/club';
import type { Court, QueueEntry, QueueMember, Member, Match, MatchPlayer, Score } from '@/types';

export function useRealtimeCourts() {
  const { setCourts, updateCourt } = useCourtStore();
  const { activeClub } = useClubStore();
  const clubId = activeClub?.id;

  useEffect(() => {
    if (!clubId) {
      setCourts([]);
      return;
    }

    const supabase = createClient();

    supabase
      .from('courts')
      .select('*')
      .eq('club_id', clubId)
      .order('display_order')
      .then(({ data }) => {
        if (data) setCourts(data as readonly Court[]);
      });

    const channel = supabase
      .channel(`courts-realtime-${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courts', filter: `club_id=eq.${clubId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            updateCourt(payload.new.id, payload.new as Court);
          } else {
            supabase
              .from('courts')
              .select('*')
              .eq('club_id', clubId)
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
  }, [clubId, setCourts, updateCourt]);
}

export function useRealtimeQueue() {
  const { setEntries } = useQueueStore();
  const { activeClub } = useClubStore();
  const clubId = activeClub?.id;

  useEffect(() => {
    if (!clubId) {
      setEntries([]);
      return;
    }

    const supabase = createClient();

    const loadQueue = async () => {
      const { data: entries } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('club_id', clubId)
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
          .select('*')
          .eq('club_id', clubId),
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
      .channel(`queue-realtime-${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter: `club_id=eq.${clubId}` },
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
  }, [clubId, setEntries]);
}

export function useRealtimeMatches() {
  const { setMatches } = useMatchStore();
  const { activeClub } = useClubStore();
  const clubId = activeClub?.id;

  useEffect(() => {
    if (!clubId) {
      setMatches([]);
      return;
    }

    const supabase = createClient();

    const loadMatches = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('club_id', clubId)
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

      const memberIds = (players ?? []).map((p) => p.member_id).filter(Boolean) as string[];
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
            member: p.member_id ? membersMap.get(p.member_id) : undefined,
          })) as readonly MatchPlayer[],
        score: scoresMap.get(match.id) ?? null,
      }));

      setMatches(result as readonly Match[]);
    };

    loadMatches();

    const channel = supabase
      .channel(`matches-realtime-${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `club_id=eq.${clubId}` },
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
  }, [clubId, setMatches]);
}

export function useRealtimeSettings() {
  const { setMatchWaitSeconds } = useSettingsStore();
  const { activeClub } = useClubStore();
  const clubId = activeClub?.id;

  useEffect(() => {
    if (!clubId) return;

    const supabase = createClient();

    supabase
      .from('club_settings')
      .select('match_wait_seconds')
      .eq('club_id', clubId)
      .single()
      .then(({ data }) => {
        if (data) setMatchWaitSeconds(data.match_wait_seconds);
      });

    const channel = supabase
      .channel(`settings-realtime-${clubId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'club_settings', filter: `club_id=eq.${clubId}` },
        (payload) => {
          if (payload.new.match_wait_seconds != null) {
            setMatchWaitSeconds(payload.new.match_wait_seconds);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, setMatchWaitSeconds]);
}
