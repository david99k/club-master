'use server';

import { createClient } from '@/lib/supabase/server';

export async function updateMatchWaitSeconds(seconds: number) {
  const supabase = await createClient();

  if (seconds < 30 || seconds > 600) {
    return { error: '대기 시간은 30초~600초 사이로 설정해주세요.' };
  }

  const { data: settings } = await supabase
    .from('club_settings')
    .select('id')
    .limit(1)
    .single();

  if (!settings) return { error: '설정을 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('club_settings')
    .update({ match_wait_seconds: seconds })
    .eq('id', settings.id);

  if (error) return { error: error.message };
  return { data: true };
}
