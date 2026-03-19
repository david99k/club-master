'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchClubs, requestJoinClub } from '@/lib/actions/club';
import { useClubStore } from '@/store/club';
import { useUserLocation, distanceInMeters } from '@/lib/hooks/use-user-location';
import { ClubMap } from '@/components/map/club-map';
import type { Club } from '@/types';

export default function ClubsPage() {
  const { activeClub } = useClubStore();
  const { location: userLocation, loading: locLoading, requestLocation } = useUserLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Club[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedClubs, setRequestedClubs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 페이지 진입 시 위치 요청 + 전체 클럽 로드
  useEffect(() => {
    requestLocation();
    loadAllClubs();
  }, [requestLocation]);

  const loadAllClubs = async () => {
    setSearching(true);
    const result = await searchClubs('');
    if (result.data) {
      setResults(result.data as Club[]);
    }
    setSearching(false);
    setInitialLoaded(true);
  };

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

  // 거리순 정렬
  const sortedResults = userLocation
    ? [...results].sort((a, b) => {
        const locA = a.locations?.[0];
        const locB = b.locations?.[0];
        if (!locA || (locA.lat === 0 && locA.lng === 0)) return 1;
        if (!locB || (locB.lat === 0 && locB.lng === 0)) return -1;
        const distA = distanceInMeters(userLocation.lat, userLocation.lng, locA.lat, locA.lng);
        const distB = distanceInMeters(userLocation.lat, userLocation.lng, locB.lat, locB.lng);
        return distA - distB;
      })
    : results;

  const getDistance = (club: Club): string | null => {
    if (!userLocation) return null;
    const loc = club.locations?.[0];
    if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;
    const dist = distanceInMeters(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
    if (dist < 1000) return `${Math.round(dist)}m`;
    return `${(dist / 1000).toFixed(1)}km`;
  };

  const mapCenter = userLocation ?? { lat: 37.5665, lng: 126.978 };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
          <span className="text-lg sm:text-2xl">🔍</span>
          클럽 찾기
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 text-xs sm:text-sm"
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? '📋 목록' : '🗺 지도'}
        </Button>
      </div>

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
          {searching ? '...' : '검색'}
        </Button>
      </div>

      {locLoading && (
        <p className="text-xs text-gray-400">위치 정보를 가져오는 중...</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          {error}
        </div>
      )}

      {/* 지도 뷰 */}
      {showMap && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 h-[350px]">
          <ClubMap
            clubs={sortedResults}
            center={mapCenter}
            userLocation={userLocation}
            level={userLocation ? 7 : 12}
          />
        </div>
      )}

      {/* 클럽 리스트 */}
      <div className="space-y-3">
        {sortedResults.map((club) => {
          const dist = getDistance(club);

          return (
            <div key={club.id} className="rounded-2xl bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{club.name}</p>
                    {dist && (
                      <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                        {dist}
                      </span>
                    )}
                  </div>
                  {club.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{club.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>멤버 {club.member_count ?? 0}명</span>
                    {club.locations && club.locations.length > 0 && (
                      <span className="truncate">{club.locations.map((l) => l.name).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 ml-3">
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
            </div>
          );
        })}
        {sortedResults.length === 0 && initialLoaded && !searching && (
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 text-center">
            <p className="text-gray-500">등록된 클럽이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
