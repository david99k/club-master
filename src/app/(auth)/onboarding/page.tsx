'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClub, searchClubs, requestJoinClub, skipClubSelection } from '@/lib/actions/club';
import { useGeocode } from '@/lib/hooks/use-geocode';
import useKakaoLoader from '@/lib/hooks/use-kakao-loader';
import { useRouter } from 'next/navigation';
import type { Club } from '@/types';

type Step = 'choose' | 'create-club' | 'find-club';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 클럽 생성 폼
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  // 클럽 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedClubs, setRequestedClubs] = useState<Set<string>>(new Set());

  useKakaoLoader();
  const { geocode } = useGeocode();

  const handleCreateClub = async () => {
    if (!clubName.trim()) { setError('클럽명을 입력해주세요.'); return; }
    if (!locationName.trim()) { setError('활동 장소명을 입력해주세요.'); return; }
    if (!locationAddress.trim()) { setError('활동 장소 주소를 입력해주세요.'); return; }

    setLoading(true);
    setError('');
    try {
      // 주소 → 좌표 변환
      const coords = await geocode(locationAddress.trim());
      const lat = coords?.lat ?? 0;
      const lng = coords?.lng ?? 0;
      const result = await createClub(clubName.trim(), clubDesc.trim() || null, [
        { name: locationName.trim(), address: locationAddress.trim(), lat, lng },
      ]);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    const result = await searchClubs(searchQuery);
    if (result.data) {
      setSearchResults(result.data as Club[]);
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

  const handleSkip = async () => {
    setLoading(true);
    await skipClubSelection();
    router.push('/');
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/login-bg.jpg)' }} />
      <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/70 via-violet-900/60 to-purple-900/80" />

      <div className="relative z-10 text-center text-white mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Sportium</h1>
        <p className="text-white/80 text-sm mt-2">가입을 환영합니다!</p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
          {/* Step: Choose */}
          {step === 'choose' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">시작하기</h2>
              <p className="text-sm text-gray-500 text-center mb-4">어떤 유형으로 시작하시겠어요?</p>

              <button
                type="button"
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                onClick={() => setStep('create-club')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
                    🏢
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">클럽 운영자</p>
                    <p className="text-xs text-gray-500">새 클럽을 만들고 관리합니다</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all"
                onClick={() => setStep('find-club')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-xl">
                    👤
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">클럽 회원</p>
                    <p className="text-xs text-gray-500">기존 클럽에 가입합니다</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="w-full text-center py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleSkip}
                disabled={loading}
              >
                클럽 없이 시작하기
              </button>
            </div>
          )}

          {/* Step: Create Club */}
          {step === 'create-club' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setStep('choose')} className="text-gray-400 hover:text-gray-600">
                  ←
                </button>
                <h2 className="text-xl font-bold">클럽 만들기</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">클럽명 *</label>
                  <Input
                    placeholder="예: 서울 피클볼 클럽"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    className="rounded-xl h-11 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">클럽 소개</label>
                  <Input
                    placeholder="클럽을 간단히 소개해주세요"
                    value={clubDesc}
                    onChange={(e) => setClubDesc(e.target.value)}
                    className="rounded-xl h-11 mt-1"
                  />
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">활동 장소 *</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="장소명 (예: OO체육관)"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="rounded-xl h-11"
                    />
                    <Input
                      placeholder="주소 (예: 서울시 강남구...)"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">추가 장소는 클럽 관리에서 등록할 수 있습니다.</p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                  {error}
                </div>
              )}

              <Button onClick={handleCreateClub} disabled={loading} className="w-full rounded-xl h-11">
                {loading ? '생성 중...' : '클럽 생성하기'}
              </Button>
            </div>
          )}

          {/* Step: Find Club */}
          {step === 'find-club' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setStep('choose')} className="text-gray-400 hover:text-gray-600">
                  ←
                </button>
                <h2 className="text-xl font-bold">클럽 찾기</h2>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="클럽명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="rounded-xl h-11"
                />
                <Button onClick={handleSearch} disabled={searching} className="rounded-xl h-11 px-6 shrink-0">
                  {searching ? '...' : '검색'}
                </Button>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                  {error}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((club) => (
                  <div key={club.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{club.name}</p>
                      {club.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{club.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        멤버 {club.member_count ?? 0}명
                        {club.locations && club.locations.length > 0 && (
                          <> · {club.locations[0].name}</>
                        )}
                      </p>
                    </div>
                    {requestedClubs.has(club.id) ? (
                      <span className="text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-full">
                        요청 완료
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs"
                        onClick={() => handleJoinRequest(club.id)}
                        disabled={loading}
                      >
                        가입 요청
                      </Button>
                    )}
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-gray-400 text-center py-6">검색 결과가 없습니다.</p>
                )}
              </div>

              <button
                type="button"
                className="w-full text-center py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleSkip}
                disabled={loading}
              >
                나중에 클럽에 가입하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
