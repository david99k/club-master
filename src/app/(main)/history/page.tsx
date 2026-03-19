'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useClubStore } from '@/store/club';
import { useIsAdmin } from '@/lib/hooks/use-auth';
import { deleteMatch } from '@/lib/actions/match';
import { Button } from '@/components/ui/button';
import type { Match, MatchPlayer, Member, Score, Court } from '@/types';

const PAGE_SIZE = 20;

interface HistoryMatch extends Match {
  readonly court?: Court;
  readonly players?: readonly MatchPlayer[];
  readonly score?: Score | null;
}

export default function HistoryPage() {
  const { member } = useAuthStore();
  const { activeClub } = useClubStore();
  const isAdmin = useIsAdmin();
  const [matches, setMatches] = useState<readonly HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [myOnly, setMyOnly] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadMatches = useCallback(async (pageNum: number, onlyMine: boolean, reset: boolean) => {
    if (!activeClub) {
      if (reset) setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      let matchIds: string[] | null = null;

      // 본인 경기만 보기: 먼저 본인이 참여한 match_id 조회
      if (onlyMine && member) {
        const { data: myPlayers } = await supabase
          .from('match_players')
          .select('match_id')
          .eq('member_id', member.id);
        matchIds = (myPlayers ?? []).map((p) => p.match_id);
        if (matchIds.length === 0) {
          if (reset) setMatches([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .from('matches')
        .select('*')
        .eq('status', 'completed')
        .eq('club_id', activeClub.id)
        .order('ended_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (matchIds) {
        query = query.in('id', matchIds);
      }

      const { data: matchData } = await query;

      if (!matchData || matchData.length === 0) {
        if (reset) setMatches([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setHasMore(matchData.length >= PAGE_SIZE);

      const ids = matchData.map((m) => m.id);
      const courtIds = [...new Set(matchData.map((m) => m.court_id))];

      const [{ data: players }, { data: scores }, { data: courts }] = await Promise.all([
        supabase.from('match_players').select('*').in('match_id', ids),
        supabase.from('scores').select('*').in('match_id', ids),
        supabase.from('courts').select('*').in('id', courtIds),
      ]);

      const memberIdsSet = new Set((players ?? []).map((p) => p.member_id).filter((id): id is string => id !== null));
      const { data: members } = memberIdsSet.size > 0
        ? await supabase.from('members').select('*').in('id', [...memberIdsSet])
        : { data: [] as Member[] };

      const membersMap = new Map((members ?? []).map((m) => [m.id, m]));
      const courtsMap = new Map((courts ?? []).map((c) => [c.id, c]));
      const scoresMap = new Map((scores ?? []).map((s) => [s.match_id, s]));

      const result: HistoryMatch[] = matchData.map((match) => ({
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

      if (reset) {
        setMatches(result);
      } else {
        setMatches((prev) => [...prev, ...result]);
      }
    } finally {
      setLoading(false);
    }
  }, [member, activeClub]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadMatches(0, myOnly, true);
  }, [myOnly, loadMatches]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMatches(nextPage, myOnly, false);
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('이 경기 기록을 삭제하시겠습니까?')) return;
    setDeleting(matchId);
    const result = await deleteMatch(matchId);
    if (result.error) {
      alert(result.error);
    } else {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    }
    setDeleting(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${mins}`;
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}분 ${secs}초`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
          <span className="text-lg sm:text-2xl">📊</span>
          경기 기록
        </h2>
        <button
          type="button"
          onClick={() => setMyOnly((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            myOnly
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {myOnly ? '내 경기만' : '전체 경기'}
        </button>
      </div>

      {loading && matches.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 sm:p-12 text-center">
          <div className="text-gray-300 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="text-gray-500">
            {myOnly ? '내 경기 기록이 없습니다.' : '경기 기록이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const teamA = match.players?.filter((p) => p.team === 'A') ?? [];
            const teamB = match.players?.filter((p) => p.team === 'B') ?? [];
            const score = match.score;
            const aWin = score && score.team_a_score > score.team_b_score;
            const bWin = score && score.team_b_score > score.team_a_score;
            const isMyMatch = member && match.players?.some((p) => p.member_id === member.id);

            return (
              <div
                key={match.id}
                className={`rounded-xl sm:rounded-2xl bg-white border p-3 sm:p-4 ${
                  isMyMatch ? 'border-indigo-200' : 'border-gray-200'
                }`}
              >
                {/* 상단: 날짜 + 코트 */}
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500">
                      {formatDate(match.ended_at)}
                    </span>
                    <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {match.court?.name ?? '코트'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-gray-400">
                      {formatDuration(match.started_at, match.ended_at)}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={deleting === match.id}
                        className="text-[10px] sm:text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting === match.id ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 팀 vs 팀 */}
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* A팀 */}
                  <div className={`flex-1 rounded-xl p-2 sm:p-3 ${
                    aWin ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold text-indigo-600">A팀</span>
                      {aWin && <span className="text-[10px] text-indigo-500 font-bold">WIN</span>}
                    </div>
                    <div className="space-y-0.5">
                      {teamA.map((p) => {
                        const name = p.member?.name ?? p.player_name ?? '(탈퇴)';
                        return (
                          <div key={p.id} className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] sm:text-xs ${
                              p.member ? 'bg-indigo-500' : 'bg-gray-400'
                            }`}>
                              {name.charAt(0)}
                            </div>
                            <span className={`text-xs sm:text-sm ${
                              p.member_id === member?.id ? 'font-bold text-indigo-700' :
                              !p.member ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {name}
                              {p.member_id === member?.id && <span className="text-indigo-400 ml-0.5">(나)</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 점수 */}
                  <div className="flex flex-col items-center shrink-0">
                    {score ? (
                      <>
                        <span className={`text-lg sm:text-2xl font-bold ${aWin ? 'text-indigo-600' : 'text-gray-700'}`}>
                          {score.team_a_score}
                        </span>
                        <span className="text-[10px] text-gray-400 my-0.5">VS</span>
                        <span className={`text-lg sm:text-2xl font-bold ${bWin ? 'text-gray-700' : 'text-gray-700'}`}>
                          {score.team_b_score}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">점수 없음</span>
                    )}
                  </div>

                  {/* B팀 */}
                  <div className={`flex-1 rounded-xl p-2 sm:p-3 ${
                    bWin ? 'bg-gray-100 ring-1 ring-gray-300' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-600">B팀</span>
                      {bWin && <span className="text-[10px] text-gray-600 font-bold">WIN</span>}
                    </div>
                    <div className="space-y-0.5">
                      {teamB.map((p) => {
                        const name = p.member?.name ?? p.player_name ?? '(탈퇴)';
                        return (
                          <div key={p.id} className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] sm:text-xs ${
                              p.member ? 'bg-gray-700' : 'bg-gray-400'
                            }`}>
                              {name.charAt(0)}
                            </div>
                            <span className={`text-xs sm:text-sm ${
                              p.member_id === member?.id ? 'font-bold text-gray-900' :
                              !p.member ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {name}
                              {p.member_id === member?.id && <span className="text-indigo-400 ml-0.5">(나)</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? '로딩 중...' : '더 보기'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
