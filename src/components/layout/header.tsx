'use client';

import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/actions/auth';
import Link from 'next/link';

export function Header() {
  const { member } = useAuthStore();
  const isAdmin = useIsAdmin();

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        <Link href="/" className="flex items-center">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight">Sportium</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/15 gap-1 px-2 sm:px-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="hidden sm:inline">기록</span>
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/admin/courts">
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/15 gap-1 px-2 sm:px-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="hidden sm:inline">관리</span>
              </Button>
            </Link>
          )}
          {member && (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/15 backdrop-blur">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/30 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {member.name.charAt(0)}
                </div>
                <span className="text-xs sm:text-sm font-medium max-w-[60px] sm:max-w-none truncate">{member.name}</span>
              </div>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit" className="text-white/70 hover:text-white hover:bg-white/15 px-2 sm:px-3 text-xs sm:text-sm">
                  로그아웃
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
