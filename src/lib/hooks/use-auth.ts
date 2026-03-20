'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useClubStore } from '@/store/club';
import type { Member, Club, ClubMember } from '@/types';

export function useAuth() {
  const { member, isLoading, setMember, setLoading } = useAuthStore();
  const { setActiveClub, setClubMembership, setMyClubs } = useClubStore();

  const setOnlineStatus = useCallback(async (memberId: string, online: boolean) => {
    const supabase = createClient();
    await supabase
      .from('members')
      .update({ is_online: online })
      .eq('id', memberId);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const loadMember = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMember(null);
        setActiveClub(null);
        setClubMembership(null);
        setLoading(false);
        return;
      }

      // 병렬: 온라인 표시 + 멤버 조회
      const [, { data }] = await Promise.all([
        supabase
          .from('members')
          .update({ is_online: true })
          .eq('auth_id', session.user.id),
        supabase
          .from('members')
          .select('*')
          .eq('auth_id', session.user.id)
          .single(),
      ]);

      const memberData = data as Member | null;
      setMember(memberData);

      // 클럽 멤버십 로드 (내가 속한 모든 클럽)
      if (memberData) {
        const { data: memberships } = await supabase
          .from('club_members')
          .select('*, club:clubs(*)')
          .eq('member_id', memberData.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true });

        const myClubs = (memberships ?? []) as ClubMember[];
        setMyClubs(myClubs);

        // 클럽이 없으면 선택 해제
        if (myClubs.length === 0) {
          setClubMembership(null);
          setActiveClub(null);
        }
        // 클럽이 있으면 선택 화면으로 (activeClub 설정하지 않음)
      }

      setLoading(false);
    };

    loadMember();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (member?.id) {
          setOnlineStatus(member.id, false);
        }
        setActiveClub(null);
        setClubMembership(null);
        setMyClubs([]);
      }
      loadMember();
    });

    return () => subscription.unsubscribe();
  }, [setMember, setLoading, setActiveClub, setClubMembership, setMyClubs, member?.id, setOnlineStatus]);

  // 브라우저 닫기/탭 닫기 시 오프라인 처리
  useEffect(() => {
    if (!member?.id) return;

    const handleBeforeUnload = () => {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/members?id=eq.${member.id}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Prefer': 'return=minimal',
      };
      fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_online: false }),
        keepalive: true,
      }).catch(() => {});
    };

    const heartbeat = setInterval(() => {
      setOnlineStatus(member.id, true);
    }, 30000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
    };
  }, [member?.id, setOnlineStatus]);

  return { member, isLoading };
}

export function useIsAdmin() {
  const { clubMembership } = useClubStore();
  const { member } = useAuthStore();
  return member?.is_super_admin ||
    clubMembership?.role === 'master' ||
    clubMembership?.role === 'admin';
}
