'use server';

import { createClient } from '@/lib/supabase/server';
import { getMyClubId } from './club-context';

export async function updateMatchWaitSeconds(seconds: number) {
  const supabase = await createClient();
  const clubId = await getMyClubId();
  if (!clubId) return { error: '클럽 정보를 찾을 수 없습니다.' };

  if (seconds < 30 || seconds > 600) {
    return { error: '대기 시간은 30초~600초 사이로 설정해주세요.' };
  }

  const { data: settings } = await supabase
    .from('club_settings')
    .select('id')
    .eq('club_id', clubId)
    .single();

  if (!settings) return { error: '설정을 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('club_settings')
    .update({ match_wait_seconds: seconds })
    .eq('id', settings.id);

  if (error) return { error: error.message };
  return { data: true };
}
