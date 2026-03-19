'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * 현재 로그인한 유저의 활성 클럽 ID를 가져옵니다.
 * 서버 액션에서 club_id가 필요할 때 사용합니다.
 */
export async function getMyClubId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .single();

  if (!member) return null;

  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('member_id', member.id)
    .eq('status', 'approved')
    .limit(1)
    .single();

  return membership?.club_id ?? null;
}
