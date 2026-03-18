'use client';

import { useState } from 'react';
import { CourtList } from '@/components/court/court-list';
import { QueueList } from '@/components/queue/queue-list';
import { JoinQueueDialog } from '@/components/queue/join-queue-dialog';
import { RoundRobinDialog } from '@/components/queue/round-robin-dialog';
import { ActiveMatchPanel } from '@/components/match/active-match-panel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/hooks/use-auth';
import { useCourtStore } from '@/store/court';
import { useQueueStore } from '@/store/queue';
import { AlertDialog } from '@/components/ui/alert-dialog';

export default function HomePage() {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roundRobinOpen, setRoundRobinOpen] = useState(false);
  const [queueAlertOpen, setQueueAlertOpen] = useState(false);
  const { member, isLoading } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { courts } = useCourtStore();
  const { entries } = useQueueStore();

  const isInQueue = member && entries.some(
    (e) => e.status === 'waiting' && e.members?.some((m) => m.member_id === member.id)
  );

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
