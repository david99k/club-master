'use client';

import { useState } from 'react';
import { useMatchStore } from '@/store/match';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { MatchTimer } from './match-timer';
import { CompleteMatchDialog } from './complete-match-dialog';
import { startMatch, swapTeams } from '@/lib/actions/match';

export function ActiveMatchPanel() {
  const { matches } = useMatchStore();
  const { member } = useAuthStore();
  const [completingMatchId, setCompletingMatchId] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  const myMatch = matches.find((m) =>
    m.players?.some((p) => p.member_id === member?.id) &&
    (m.status === 'pending' || m.status === 'playing')
  );

  if (!myMatch) return null;

  const isPlaying = myMatch.status === 'playing';
  const isPending = myMatch.status === 'pending';

  const teamA = myMatch.players?.filter((p) => p.team === 'A') ?? [];
  const teamB = myMatch.players?.filter((p) => p.team === 'B') ?? [];

  const handleStartPlay = async () => {
    await startMatch(myMatch.id);
  };

  // 팀 변경: A팀 2번째와 B팀 1번째를 교체
  const handleSwapTeams = async () => {
    if (teamA.length < 2 || teamB.length < 1) return;
    setSwapping(true);
    try {
      await swapTeams(myMatch.id, teamA[1].id, teamB[0].id);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <>
      <div className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 ${
        isPlaying ? 'border-indigo-500 shadow-lg shadow-indigo-500/15' : 'border-indigo-400'
      }`}>
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-white">
              <span className="text-base sm:text-lg">🎾</span>
              <span className="font-bold text-sm sm:text-base">내 시합</span>
              <span className="text-xs sm:text-sm text-white/70">- {myMatch.court?.name ?? '코트'}</span>
            </div>
            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
              isPlaying ? 'bg-green-400/20 text-green-100' : 'bg-white/20 text-white'
            }`}>
              {isPlaying ? '경기중' : '대기'}
            </span>
          </div>
          <div className="flex justify-end mt-1">
            <MatchTimer match={myMatch} />
          </div>
        </div>

        {/* 플레이어 */}
        <div className="bg-white p-3 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-4">
            {/* A팀 */}
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-indigo-600 mb-1.5 sm:mb-2">A팀</div>
              <div className="space-y-1.5 sm:space-y-2">
                {teamA.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs sm:text-base">
                      {p.member?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="text-xs sm:text-sm font-medium truncate">
                      {p.member?.name}
                      {p.member_id === member?.id && <span className="text-indigo-500 ml-0.5 sm:ml-1">(나)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* B팀 */}
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-gray-600 mb-1.5 sm:mb-2">B팀</div>
              <div className="space-y-1.5 sm:space-y-2">
                {teamB.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs sm:text-base">
                      {p.member?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="text-xs sm:text-sm font-medium truncate">
                      {p.member?.name}
                      {p.member_id === member?.id && <span className="text-indigo-500 ml-0.5 sm:ml-1">(나)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            {isPending && (
              <Button
                variant="outline"
                onClick={handleSwapTeams}
                disabled={swapping}
                className="w-full rounded-xl h-10 sm:h-11 text-sm sm:text-base border-indigo-300 text-indigo-600 hover:bg-indigo-50 gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M16 3l4 4-4 4" />
                  <path d="M20 7H4" />
                  <path d="M8 21l-4-4 4-4" />
                  <path d="M4 17h16" />
                </svg>
                {swapping ? '변경 중...' : '팀 변경'}
              </Button>
            )}
            {isPending && (
              <Button onClick={handleStartPlay} className="w-full rounded-xl h-10 sm:h-11 text-sm sm:text-base gap-2">
                플레이 시작
              </Button>
            )}
            {isPlaying && (
              <Button
                variant="outline"
                onClick={() => setCompletingMatchId(myMatch.id)}
                className="w-full rounded-xl h-10 sm:h-11 text-sm sm:text-base border-amber-400 text-amber-600 hover:bg-amber-50 gap-2"
              >
                경기 종료
              </Button>
            )}
          </div>
        </div>
      </div>

      {completingMatchId && (
        <CompleteMatchDialog
          matchId={completingMatchId}
          open={!!completingMatchId}
          onOpenChange={(open) => {
            if (!open) setCompletingMatchId(null);
          }}
        />
      )}
    </>
  );
}
