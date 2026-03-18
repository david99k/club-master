'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import type { Member } from '@/types';

export function useAuth() {
  const { member, isLoading, setMember, setLoading } = useAuthStore();

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

      setMember(data as Member | null);
      setLoading(false);
    };

    loadMember();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // 로그아웃 시 오프라인 (member가 아직 있을 때 처리)
        if (member?.id) {
          setOnlineStatus(member.id, false);
        }
      }
      loadMember();
    });

    return () => subscription.unsubscribe();
  }, [setMember, setLoading, member?.id, setOnlineStatus]);

  // 브라우저 닫기/탭 닫기 시 오프라인 처리
  useEffect(() => {
    if (!member?.id) return;

    const handleBeforeUnload = () => {
      const supabase = createClient();
      // sendBeacon으로 비동기 요청 (페이지 닫혀도 전송)
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/members?id=eq.${member.id}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Prefer': 'return=minimal',
      };
      // navigator.sendBeacon은 POST만 지원, Supabase REST는 PATCH 필요
      // 대신 동기 fetch로 처리 (keepalive)
      fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_online: false }),
        keepalive: true,
      }).catch(() => {});
    };

    // 주기적 heartbeat로 온라인 상태 갱신 (30초마다)
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
  const { member } = useAuthStore();
  return member?.role === 'admin' || member?.role === 'sub_admin';
}
