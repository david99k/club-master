'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchClubs, requestJoinClub } from '@/lib/actions/club';
import { useClubStore } from '@/store/club';
import type { Club } from '@/types';

export default function ClubsPage() {
  const { activeClub } = useClubStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Club[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedClubs, setRequestedClubs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setSearching(true);
    setError('');
    const result = await searchClubs(query);
    if (result.data) {
      setResults(result.data as Club[]);
    } else if (result.error) {
      setError(result.error);
    }
    setSearching(false);
  };

  const handleJoinRequest = async (clubId: string) => {
    setLoading(true);
    setError('');
    const result = await requestJoinClub(clubId);
    if (result.error) {
      setError(result.error);
    } else {
      setRequestedClubs((prev) => new Set([...prev, clubId]));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
        <span className="text-lg sm:text-2xl">🔍</span>
        클럽 찾기
      </h2>

      {activeClub && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-700">
          현재 <strong>{activeClub.name}</strong>에 소속되어 있습니다.
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="클럽명 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="rounded-xl h-11"
        />
        <Button onClick={handleSearch} disabled={searching} className="rounded-xl h-11 px-6 shrink-0">
          {searching ? '검색 중...' : '검색'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {results.map((club) => (
          <div key={club.id} className="rounded-2xl bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{club.name}</p>
                {club.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{club.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>멤버 {club.member_count ?? 0}명</span>
                  {club.locations && club.locations.length > 0 && (
                    <span>{club.locations.map((l) => l.name).join(', ')}</span>
                  )}
                </div>
              </div>
              {activeClub?.id === club.id ? (
                <span className="text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-full">
                  소속 중
                </span>
              ) : requestedClubs.has(club.id) ? (
                <span className="text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-full">
                  요청 완료
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleJoinRequest(club.id)}
                  disabled={loading || !!activeClub}
                >
                  가입 요청
                </Button>
              )}
            </div>
          </div>
        ))}
        {results.length === 0 && query && !searching && (
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 text-center">
            <p className="text-gray-500">검색 결과가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">다른 검색어로 시도해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
