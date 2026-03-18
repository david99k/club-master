'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Match } from '@/types';
import { startMatch } from '@/lib/actions/match';

interface MatchTimerProps {
  readonly match: Match;
}

export function MatchTimer({ match }: MatchTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');

  const calculateElapsed = useCallback(() => {
    const start = match.status === 'playing' && match.started_at
      ? new Date(match.started_at)
      : new Date(match.created_at);

    const diff = Math.floor((Date.now() - start.getTime()) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [match.status, match.started_at, match.created_at]);

  useEffect(() => {
    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [calculateElapsed]);

  // 2분 초과 시 자동 플레이 시작
  useEffect(() => {
    if (match.status !== 'pending') return;

    const created = new Date(match.created_at).getTime();
    const twoMinutes = 2 * 60 * 1000;
    const remaining = twoMinutes - (Date.now() - created);

    if (remaining <= 0) {
      startMatch(match.id);
      return;
    }

    const timeout = setTimeout(() => {
      startMatch(match.id);
    }, remaining);

    return () => clearTimeout(timeout);
  }, [match.id, match.status, match.created_at]);

  const isPending = match.status === 'pending';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isPending
          ? 'bg-amber-100 text-amber-700'
          : 'bg-red-100 text-red-600'
      }`}>
        {isPending ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            대기
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            경기중
          </>
        )}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">{elapsed}</span>
    </div>
  );
}
