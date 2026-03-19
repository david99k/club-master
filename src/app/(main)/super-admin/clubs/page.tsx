'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { Club } from '@/types';

interface ClubWithStats extends Club {
  readonly _member_count: number;
}

export default function SuperAdminClubsPage() {
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('clubs')
      .select('*, locations:club_locations(*)')
      .order('created_at', { ascending: false });

    if (data) {
      // 각 클럽의 멤버 수 조회
      const clubIds = data.map((c) => c.id);
      const { data: memberships } = await supabase
        .from('club_members')
        .select('club_id')
        .in('club_id', clubIds)
        .eq('status', 'approved');

      const countMap = new Map<string, number>();
      for (const m of memberships ?? []) {
        countMap.set(m.club_id, (countMap.get(m.club_id) ?? 0) + 1);
      }

      setClubs(data.map((club) => ({
        ...club,
        _member_count: countMap.get(club.id) ?? 0,
      })) as ClubWithStats[]);
    }
    setLoading(false);
  };

  const toggleClubActive = async (clubId: string, isActive: boolean) => {
    const supabase = createClient();
    await supabase.from('clubs').update({ is_active: !isActive }).eq('id', clubId);
    setClubs((prev) =>
      prev.map((c) => c.id === clubId ? { ...c, is_active: !isActive } : c)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          클럽 목록 ({clubs.length}개)
        </h3>

        <div className="space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{club.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      club.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {club.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  {club.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{club.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>멤버 {club._member_count}명</span>
                    {club.locations && club.locations.length > 0 && (
                      <span>{club.locations.map((l) => l.name).join(', ')}</span>
                    )}
                    <span>{new Date(club.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full text-xs ${
                    club.is_active
                      ? 'border-red-300 text-red-500 hover:bg-red-50'
                      : 'border-green-300 text-green-500 hover:bg-green-50'
                  }`}
                  onClick={() => toggleClubActive(club.id, club.is_active)}
                >
                  {club.is_active ? '비활성화' : '활성화'}
                </Button>
              </div>
            </div>
          ))}
          {clubs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">등록된 클럽이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
