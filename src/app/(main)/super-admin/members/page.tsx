'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhone } from '@/lib/utils';
import type { Member } from '@/types';

interface MemberWithClub extends Member {
  readonly club_name: string | null;
}

export default function SuperAdminMembersPage() {
  const [members, setMembers] = useState<MemberWithClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // 클럽 소속 정보 조회
      const memberIds = data.map((m) => m.id);
      const { data: memberships } = await supabase
        .from('club_members')
        .select('member_id, club:clubs(name)')
        .in('member_id', memberIds)
        .eq('status', 'approved');

      const clubMap = new Map<string, string>();
      for (const m of (memberships ?? []) as unknown as { member_id: string; club: { name: string } | null }[]) {
        if (m.club?.name) {
          clubMap.set(m.member_id, m.club.name);
        }
      }

      setMembers(data.map((member) => ({
        ...member,
        club_name: clubMap.get(member.id) ?? null,
      })) as MemberWithClub[]);
    }
    setLoading(false);
  };

  const toggleSuperAdmin = async (memberId: string, current: boolean) => {
    if (!confirm(current ? '최고 관리자 권한을 해제하시겠습니까?' : '최고 관리자 권한을 부여하시겠습니까?')) return;
    const supabase = createClient();
    await supabase.from('members').update({ is_super_admin: !current }).eq('id', memberId);
    setMembers((prev) =>
      prev.map((m) => m.id === memberId ? { ...m, is_super_admin: !current } : m)
    );
  };

  const filteredMembers = search.trim()
    ? members.filter((m) =>
        m.name.includes(search.trim()) ||
        m.phone?.includes(search.trim()) ||
        m.club_name?.includes(search.trim())
      )
    : members;

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
          전체 회원 ({members.length}명)
        </h3>

        <Input
          placeholder="이름, 연락처, 클럽명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl h-11 mb-4"
        />

        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div key={member.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      member.is_online ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{member.name}</p>
                      {member.is_super_admin && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          슈퍼관리자
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {member.phone ? formatPhone(member.phone) : '연락처 없음'}
                      {member.club_name && (
                        <> · <span className="text-indigo-500">{member.club_name}</span></>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full text-xs ${
                    member.is_super_admin
                      ? 'border-red-300 text-red-500 hover:bg-red-50'
                      : 'border-amber-300 text-amber-600 hover:bg-amber-50'
                  }`}
                  onClick={() => toggleSuperAdmin(member.id, member.is_super_admin)}
                >
                  {member.is_super_admin ? '권한 해제' : '관리자 지정'}
                </Button>
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? '검색 결과가 없습니다.' : '회원이 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
