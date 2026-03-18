import { useMemo } from 'react';
import { useQueueStore } from '@/store/queue';
import { useMatchStore } from '@/store/match';

/** 대기열(waiting/assigned)이나 시합(pending/playing) 중인 멤버 ID Set */
export function useBusyMemberIds(): Set<string> {
  const { entries } = useQueueStore();
  const { matches } = useMatchStore();

  return useMemo(() => {
    const ids = new Set<string>();

    // 대기열에 있는 멤버
    for (const entry of entries) {
      if (entry.status === 'waiting' || entry.status === 'assigned') {
        for (const m of entry.members ?? []) {
          ids.add(m.member_id);
        }
      }
    }

    // 시합 중인 멤버
    for (const match of matches) {
      if (match.status === 'pending' || match.status === 'playing') {
        for (const p of match.players ?? []) {
          ids.add(p.member_id);
        }
      }
    }

    return ids;
  }, [entries, matches]);
}
