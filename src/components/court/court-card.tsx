'use client';

import type { Court, Match } from '@/types';
import { MatchTimer } from '@/components/match/match-timer';

interface CourtCardProps {
  readonly court: Court;
  readonly match?: Match | null;
}

export function CourtCard({ court, match }: CourtCardProps) {
  const isActive = match && (match.status === 'pending' || match.status === 'playing');
  const isPlaying = match?.status === 'playing';
  const isUnavailable = court.status === 'repairing' || court.status === 'lesson' || court.status === 'waiting';

  return (
    <div className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
      isActive
        ? 'border-2 border-indigo-500 bg-white shadow-lg shadow-indigo-500/10'
        : 'border-2 border-dashed border-gray-300 bg-white'
    } ${isUnavailable && !isActive ? 'opacity-60' : ''}`}>
      {/* 활성 시 빨간 점 */}
      {isPlaying && (
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      )}

      {/* 코트 이름 헤더 */}
      <div className={`px-4 py-2.5 text-center text-sm font-bold tracking-wide ${
        isActive
          ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white'
          : 'bg-gray-100 text-gray-600'
      }`}>
        {court.name.toUpperCase()}
        {court.status === 'lesson' && !isActive && (
          <span className="ml-2 text-xs font-normal opacity-70">(레슨중)</span>
        )}
        {court.status === 'repairing' && (
          <span className="ml-2 text-xs font-normal opacity-70">(수리중)</span>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4 min-h-[120px] flex flex-col items-center justify-center">
        {isActive && match.players && match.players.length > 0 ? (
          <div className="w-full space-y-3">
            {/* 플레이어 그리드 (2x2) */}
            <div className="grid grid-cols-2 gap-3">
              {match.players.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    p.team === 'A' ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}>
                    {p.member?.name?.charAt(0) ?? '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{p.member?.name ?? '알 수 없음'}</span>
                </div>
              ))}
            </div>

            {/* 타이머 / 상태 */}
            <div className="flex items-center justify-center gap-2">
              <MatchTimer match={match} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-sm">
              {court.status === 'operating' ? '비어 있음' :
               court.status === 'lesson' ? '레슨 진행중' :
               court.status === 'repairing' ? '수리중' : '대기중'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
