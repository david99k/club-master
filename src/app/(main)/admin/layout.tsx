'use client';

import { useIsAdmin } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const MENU_ITEMS = [
  {
    href: '/admin/courts',
    label: '코트 관리',
    icon: '🏟',
  },
  {
    href: '/admin/members',
    label: '회원 관리',
    icon: '👥',
  },
];

export default function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();
  const router = useRouter();

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
        <Button variant="link" onClick={() => router.push('/')}>
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚙️ 관리자</h1>
          <p className="text-sm text-gray-500 mt-0.5">코트 및 회원 관리</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5">
            ← 홈으로
          </Button>
        </Link>
      </div>

      <div className="flex gap-6">
        {/* 좌측 사이드바 메뉴 */}
        <nav className="w-48 shrink-0">
          <div className="sticky top-24 space-y-1">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 우측 콘텐츠 */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
