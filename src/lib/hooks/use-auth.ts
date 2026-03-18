'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import type { Member } from '@/types';

export function useAuth() {
  const { member, isLoading, setMember, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const loadMember = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMember(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      setMember(data as Member | null);
      setLoading(false);
    };

    loadMember();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadMember();
    });

    return () => subscription.unsubscribe();
  }, [setMember, setLoading]);

  return { member, isLoading };
}

export function useIsAdmin() {
  const { member } = useAuthStore();
  return member?.role === 'admin' || member?.role === 'sub_admin';
}
