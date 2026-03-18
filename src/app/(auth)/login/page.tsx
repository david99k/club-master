'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/actions/auth';
import { formatPhone, stripPhone } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = stripPhone(e.target.value);
    setPhone(formatPhone(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn(name, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 pt-16 pb-24 px-4 text-center text-white">
        <h1 className="text-3xl font-extrabold tracking-tight">Sportium</h1>
        <p className="text-white/70 text-sm mt-2">실시간 코트 매칭 시스템</p>
      </div>

      <div className="flex-1 -mt-12 px-4">
        <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-center mb-6">로그인</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={handlePhoneChange}
                className="rounded-xl h-11"
                required
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full rounded-xl h-11 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : '로그인'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              처음이신가요?{' '}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                회원가입
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
