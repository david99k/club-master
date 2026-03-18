'use client';

import { useState } from 'react';
import { useMatchStore } from '@/store/match';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { MatchTimer } from './match-timer';
import { CompleteMatchDialog } from './complete-match-dialog';
import { startMatch } from '@/lib/actions/match';

export function ActiveMatchPanel() {
  const { matches } = useMatchStore();
  const { member } = useAuthStore();
  const [completingMatchId, setCompletingMatchId] = useState<string | null>(null);

  const myMatch = matches.find((m) =>
    m.players?.some((p) => p.member_id === member?.id) &&
    (m.status === 'pending' || m.status === 'playing')
  );

  if (!myMatch) return null;

  const isPlaying = myMatch.status === 'playing';

  const handleStartPlay = async () => {
    await startMatch(myMatch.id);
  };

  return (
    <>
      <div className={`rounded-2xl overflow-hidden border-2 ${
        isPlaying ? 'border-indigo-500 shadow-lg shadow-indigo-500/15' : 'border-indigo-400'
      }`}>
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg">🎾</span>
            <span className="font-bold">내 시합</span>
            <span className="text-sm text-white/70">- {myMatch.court?.name ?? '코트'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPlaying ? 'bg-green-400/20 text-green-100' : 'bg-white/20 text-white'
            }`}>
              {isPlaying ? '경기중' : '플레이 대기'}
            </span>
            <MatchTimer match={myMatch} />
          </div>
        </div>

        {/* 플레이어 */}
        <div className="bg-white p-5">
          <div className="grid grid-cols-2 gap-6 mb-4">
            {/* A팀 */}
            <div>
              <div className="text-xs font-bold text-indigo-600 mb-2">A팀</div>
              <div className="space-y-2">
                {myMatch.players?.filter((p) => p.team === 'A').map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                      {p.member?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {p.member?.name}
                        {p.member_id === member?.id && <span className="text-indigo-500 ml-1">(나)</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* B팀 */}
            <div>
              <div className="text-xs font-bold text-gray-600 mb-2">B팀</div>
              <div className="space-y-2">
                {myMatch.players?.filter((p) => p.team === 'B').map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                      {p.member?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {p.member?.name}
                        {p.member_id === member?.id && <span className="text-indigo-500 ml-1">(나)</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          {myMatch.status === 'pending' && (
            <Button onClick={handleStartPlay} className="w-full rounded-xl h-11 text-base gap-2">
              ▶ 플레이 시작
            </Button>
          )}
          {myMatch.status === 'playing' && (
            <Button
              variant="outline"
              onClick={() => setCompletingMatchId(myMatch.id)}
              className="w-full rounded-xl h-11 text-base border-amber-400 text-amber-600 hover:bg-amber-50 gap-2"
            >
              🏁 경기 종료
            </Button>
          )}
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
