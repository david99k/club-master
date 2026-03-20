'use client';

import { useState } from 'react';
import { CourtList } from '@/components/court/court-list';
import { QueueList } from '@/components/queue/queue-list';
import { JoinQueueDialog } from '@/components/queue/join-queue-dialog';
import { RoundRobinDialog } from '@/components/queue/round-robin-dialog';
import { ActiveMatchPanel } from '@/components/match/active-match-panel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useClubStore } from '@/store/club';
import { useIsAdmin } from '@/lib/hooks/use-auth';
import { useCourtStore } from '@/store/court';
import { useQueueStore } from '@/store/queue';
import { AlertDialog } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import type { ClubMember } from '@/types';

function ClubSelectList() {
  const { myClubs, selectClub } = useClubStore();

  return (
    <div className="max-w-md mx-auto py-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl mx-auto">
          🏸
        </div>
        <h2 className="text-xl font-bold">내 클럽</h2>
        <p className="text-sm text-gray-500">입장할 클럽을 선택하세요</p>
      </div>
      <div className="space-y-3">
        {myClubs.map((membership) => {
          const club = membership.club;
          if (!club) return null;
          const roleLabel = membership.role === 'master' ? '마스터' : membership.role === 'admin' ? '관리자' : '회원';
          return (
            <button
              key={membership.id}
              onClick={() => selectClub(membership)}
              className="w-full text-left p-4 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {club.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base truncate">{club.name}</span>
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
                      {roleLabel}
                    </span>
                  </div>
                  {club.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{club.description}</p>
                  )}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400 shrink-0">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Link href="/clubs">
          <Button variant="outline" className="w-full rounded-xl h-11">다른 클럽 찾기</Button>
        </Link>
        <Link href="/onboarding">
          <Button variant="outline" className="w-full rounded-xl h-11">새 클럽 만들기</Button>
        </Link>
      </div>
    </div>
  );
}

function Dashboard() {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roundRobinOpen, setRoundRobinOpen] = useState(false);
  const [queueAlertOpen, setQueueAlertOpen] = useState(false);
  const { member } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { courts } = useCourtStore();
  const { entries } = useQueueStore();

  const isInQueue = member && entries.some(
    (e) => e.status === 'waiting' && e.members?.some((m) => m.member_id === member.id)
  );

  return (
    <div className="space-y-5 sm:space-y-8 max-w-5xl mx-auto">
      {/* 내 시합 패널 */}
      <ActiveMatchPanel />

      {/* 현재 코트 상황 */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl">🏟</span>
            현재 코트 상황
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            총 {courts.length}개 코트
          </span>
        </div>
        <CourtList />
      </section>

      {/* 대기 명단 */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl">📋</span>
            대기 명단
          </h2>
          <div className="flex gap-1.5 sm:gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setRoundRobinOpen(true)} className="gap-1 sm:gap-1.5 rounded-full text-xs sm:text-sm">
                랜덤 플레이
              </Button>
            )}
            <Button size="sm" onClick={() => {
              if (isInQueue) {
                setQueueAlertOpen(true);
                return;
              }
              setJoinDialogOpen(true);
            }} className="gap-1 sm:gap-1.5 rounded-full text-xs sm:text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              대기 만들기
            </Button>
          </div>
        </div>
        <QueueList />
      </section>

      <JoinQueueDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
      <RoundRobinDialog open={roundRobinOpen} onOpenChange={setRoundRobinOpen} />
      <AlertDialog
        open={queueAlertOpen}
        onOpenChange={setQueueAlertOpen}
        title="현재 대기중입니다"
        description="이미 대기열에 등록되어 있습니다. 기존 대기를 취소한 후 다시 시도해주세요."
      />
    </div>
  );
}

export default function HomePage() {
  const { member, isLoading } = useAuthStore();
  const { activeClub, myClubs } = useClubStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  // 클럽 미소속 안내
  if (myClubs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl mx-auto">
          🏢
        </div>
        <h2 className="text-xl font-bold">클럽에 소속되어 있지 않습니다</h2>
        <p className="text-sm text-gray-500">클럽에 가입하면 코트 현황, 대기 명단, 경기 기록 등을 이용할 수 있습니다.</p>
        <div className="flex flex-col gap-2">
          <Link href="/clubs">
            <Button className="w-full rounded-xl h-11">클럽 찾기</Button>
          </Link>
          <Link href="/onboarding">
            <Button variant="outline" className="w-full rounded-xl h-11">새 클럽 만들기</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 클럽이 여러 개이고 아직 선택하지 않은 경우 → 클럽 리스트
  if (!activeClub) {
    return <ClubSelectList />;
  }

  // 클럽 선택됨 → 대시보드
  return <Dashboard />;
}
