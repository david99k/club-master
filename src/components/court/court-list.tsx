'use client';

import { useCourtStore } from '@/store/court';
import { useMatchStore } from '@/store/match';
import { CourtCard } from './court-card';

export function CourtList() {
  const { courts } = useCourtStore();
  const { matches } = useMatchStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courts.map((court) => {
        const activeMatch = matches.find(
          (m) =>
            m.court_id === court.id &&
            (m.status === 'pending' || m.status === 'playing')
        );
        return (
          <CourtCard key={court.id} court={court} match={activeMatch} />
        );
      })}
      {courts.length === 0 && (
        <div className="col-span-full rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 12h18" />
              <path d="M12 3v18" />
            </svg>
          </div>
          <p className="text-gray-500">등록된 코트가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">관리자가 코트를 추가해 주세요</p>
        </div>
      )}
    </div>
  );
}
