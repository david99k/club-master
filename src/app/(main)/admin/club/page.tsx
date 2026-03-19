'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClubStore } from '@/store/club';
import { updateClub, addClubLocation, updateClubLocation, deleteClubLocation } from '@/lib/actions/club';
import { useGeocode } from '@/lib/hooks/use-geocode';
import useKakaoLoader from '@/lib/hooks/use-kakao-loader';
import type { ClubLocation } from '@/types';

export default function AdminClubPage() {
  const { activeClub, setActiveClub } = useClubStore();
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [locations, setLocations] = useState<ClubLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 새 장소 폼
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [addingLoc, setAddingLoc] = useState(false);

  // 수정 중인 장소
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');

  useEffect(() => {
    if (!activeClub) return;
    setClubName(activeClub.name);
    setClubDesc(activeClub.description ?? '');
    loadLocations();
  }, [activeClub]);

  const loadLocations = async () => {
    if (!activeClub) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('club_locations')
      .select('*')
      .eq('club_id', activeClub.id)
      .order('is_primary', { ascending: false });
    if (data) setLocations(data as ClubLocation[]);
  };

  const handleSaveClub = async () => {
    setSaving(true);
    setSaved(false);
    const result = await updateClub(clubName, clubDesc || null);
    if (result.error) {
      alert(result.error);
    } else {
      setSaved(true);
      if (activeClub) {
        setActiveClub({ ...activeClub, name: clubName.trim(), description: clubDesc || null });
      }
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleAddLocation = async () => {
    if (!newLocName.trim() || !newLocAddress.trim()) return;
    setAddingLoc(true);
    // 주소 → 좌표 변환
    const coords = await geocode(newLocAddress.trim());
    const lat = coords?.lat ?? 0;
    const lng = coords?.lng ?? 0;
    const result = await addClubLocation(newLocName.trim(), newLocAddress.trim(), lat, lng);
    if (result.error) {
      alert(result.error);
    } else {
      setNewLocName('');
      setNewLocAddress('');
      await loadLocations();
    }
    setAddingLoc(false);
  };

  const handleUpdateLocation = async (locId: string) => {
    if (!editLocName.trim() || !editLocAddress.trim()) return;
    const coords = await geocode(editLocAddress.trim());
    const lat = coords?.lat ?? 0;
    const lng = coords?.lng ?? 0;
    const result = await updateClubLocation(locId, editLocName.trim(), editLocAddress.trim(), lat, lng);
    if (result.error) {
      alert(result.error);
    } else {
      setEditingLocId(null);
      await loadLocations();
    }
  };

  const handleDeleteLocation = async (locId: string, locName: string) => {
    if (!confirm(`"${locName}" 장소를 삭제하시겠습니까?`)) return;
    const result = await deleteClubLocation(locId);
    if (result.error) {
      alert(result.error);
    } else {
      await loadLocations();
    }
  };

  const startEditLocation = (loc: ClubLocation) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocAddress(loc.address ?? '');
  };

  useKakaoLoader();
  const { geocode } = useGeocode();

  if (!activeClub) {
    return <p className="text-center text-gray-500 py-12">클럽 정보를 불러오는 중...</p>;
  }

  return (
    <div className="space-y-5">
      {/* 클럽 기본 정보 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">클럽 정보</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">클럽명</label>
            <Input
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="rounded-xl h-11 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">클럽 소개</label>
            <Input
              value={clubDesc}
              onChange={(e) => setClubDesc(e.target.value)}
              placeholder="클럽을 소개해주세요"
              className="rounded-xl h-11 mt-1"
            />
          </div>
          <Button
            onClick={handleSaveClub}
            disabled={saving}
            className="rounded-xl h-11"
          >
            {saving ? '저장 중...' : saved ? '저장 완료!' : '저장'}
          </Button>
        </div>
      </div>

      {/* 활동 장소 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="text-primary">+</span> 활동 장소
        </h3>

        {/* 새 장소 추가 */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="장소명"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            className="rounded-xl h-11"
          />
          <Input
            placeholder="주소"
            value={newLocAddress}
            onChange={(e) => setNewLocAddress(e.target.value)}
            className="rounded-xl h-11"
          />
          <Button onClick={handleAddLocation} disabled={addingLoc} className="rounded-xl h-11 px-6 shrink-0">
            추가
          </Button>
        </div>

        {/* 장소 목록 */}
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-xl border border-gray-200 p-3">
              {editingLocId === loc.id ? (
                <div className="space-y-2">
                  <Input
                    value={editLocName}
                    onChange={(e) => setEditLocName(e.target.value)}
                    className="rounded-xl h-10"
                  />
                  <Input
                    value={editLocAddress}
                    onChange={(e) => setEditLocAddress(e.target.value)}
                    className="rounded-xl h-10"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={() => handleUpdateLocation(loc.id)}>
                      저장
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditingLocId(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{loc.name}</p>
                    <p className="text-xs text-gray-400">{loc.address ?? '주소 없음'}</p>
                    {loc.is_primary && (
                      <span className="text-xs text-indigo-500 font-medium">대표 장소</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => startEditLocation(loc)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-red-300 text-red-500 hover:bg-red-50 text-xs"
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">등록된 활동 장소가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
