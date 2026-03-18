'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/** 전화번호 → 내부 이메일 변환 */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@sportium.app`;
}

export async function signUp(name: string, phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) {
    return { error: '올바른 연락처를 입력해주세요.' };
  }
  if (!name.trim()) {
    return { error: '이름을 입력해주세요.' };
  }

  const supabase = await createClient();
  const email = phoneToEmail(digits);

  // 이미 가입된 연락처인지 확인
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('phone', digits)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: '이미 가입된 연락처입니다.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: digits,
    options: {
      data: { name },
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    const { error: memberError } = await supabase.from('members').insert({
      auth_id: data.user.id,
      name: name.trim(),
      phone: digits,
      role: 'user',
    });

    if (memberError) return { error: memberError.message };
  }

  return { data };
}

export async function signIn(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) {
    return { error: '올바른 연락처를 입력해주세요.' };
  }

  const supabase = await createClient();
  const email = phoneToEmail(digits);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: digits,
  });

  if (error) return { error: '등록되지 않은 연락처이거나 정보가 일치하지 않습니다.' };
  return { data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
