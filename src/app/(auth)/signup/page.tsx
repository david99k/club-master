'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/lib/actions/auth';
import { formatPhone, stripPhone } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
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
      const result = await signUp(name, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/login-bg.jpg)' }} />
      <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/70 via-violet-900/60 to-purple-900/80" />

      <div className="relative z-10 text-center text-white mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Sportium</h1>
        <p className="text-white/80 text-sm mt-2">새 계정을 만들어 시작하세요</p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-center mb-6">회원가입</h2>
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
                  가입 중...
                </span>
              ) : '회원가입'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
