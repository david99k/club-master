'use client';

import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const MENU_ITEMS = [
  { href: '/super-admin', label: '대시보드', icon: '📊' },
  { href: '/super-admin/clubs', label: '클럽 관리', icon: '🏢' },
  { href: '/super-admin/members', label: '전체 회원', icon: '👥' },
];

export default function SuperAdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { member } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  if (!member?.is_super_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">최고 관리자 권한이 필요합니다.</p>
        <Button variant="link" onClick={() => router.push('/')}>
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">🛡 최고 관리자</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">플랫폼 전체 관리</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5">
            ← 홈으로
          </Button>
        </Link>
      </div>

      {/* 모바일: 탭 메뉴 */}
      <div className="flex gap-2 mb-4 md:hidden">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <span>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex gap-6">
        {/* 데스크톱: 좌측 사이드바 */}
        <nav className="w-48 shrink-0 hidden md:block">
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

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
