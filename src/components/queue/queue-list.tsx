'use client';

import { useQueueStore } from '@/store/queue';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { joinExistingQueue, cancelQueue, leaveQueue, addMembersToQueue } from '@/lib/actions/queue';
import { createClient } from '@/lib/supabase/client';
import { useBusyMemberIds } from '@/lib/hooks/use-busy-members';
import { useState, useEffect } from 'react';
import type { Member } from '@/types';

export function QueueList() {
  const { entries } = useQueueStore();
  const { member } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addDialogEntryId, setAddDialogEntryId] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const busyIds = useBusyMemberIds();

  const waitingEntries = entries.filter((e) => e.status === 'waiting');
  const assignedEntries = entries.filter((e) => e.status === 'assigned');
  const allEntries = [...assignedEntries, ...waitingEntries];

  const isInQueue = entries.some((e) =>
    e.members?.some((m) => m.member_id === member?.id)
  );

  // 인원추가 다이얼로그 열릴 때 회원 목록 로드
  useEffect(() => {
    if (!addDialogEntryId) return;
    const supabase = createClient();
    supabase
      .from('members')
      .select('*')
      .order('is_online', { ascending: false })
      .order('name')
      .then(({ data }) => {
        if (data) setAllMembers(data as Member[]);
      });
  }, [addDialogEntryId]);

  const handleJoin = async (entryId: string) => {
    setLoadingId(entryId);
    try {
      await joinExistingQueue(entryId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (entryId: string) => {
    setLoadingId(entryId);
    try {
      const entry = entries.find((e) => e.id === entryId);
      const isCreator = entry?.members?.some(
        (m) => m.member_id === member?.id && m.is_creator
      );
      if (isCreator || isAdmin) {
        await cancelQueue(entryId);
      } else {
        await leaveQueue(entryId);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const openAddDialog = (entryId: string) => {
    setSelectedIds([]);
    setAddDialogEntryId(entryId);
  };

  const handleAddMembers = async () => {
    if (!addDialogEntryId || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const result = await addMembersToQueue(addDialogEntryId, selectedIds);
      if (result.error) {
        alert(result.error);
      } else {
        setAddDialogEntryId(null);
        setSelectedIds([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMember = (id: string) => {
    const entry = entries.find((e) => e.id === addDialogEntryId);
    const currentCount = entry?.members?.length ?? 0;
    const maxAdd = 4 - currentCount;

    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < maxAdd
          ? [...prev, id]
          : prev
    );
  };

  // 다이얼로그에서 대기열/시합 중인 멤버 제외
  const currentEntry = entries.find((e) => e.id === addDialogEntryId);
  const availableMembers = allMembers.filter((m) => !busyIds.has(m.id));
  const maxAdd = 4 - (currentEntry?.members?.length ?? 0);

  if (allEntries.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-12 text-center">
        <div className="text-gray-300 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 mx-auto">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-gray-500">현재 대기 중인 팀이 없습니다.</p>
        <p className="text-gray-400 text-sm mt-1">새로운 대기를 만들어보세요!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {allEntries.map((entry, index) => {
          const memberCount = entry.members?.length ?? 0;
          const isOwnEntry = entry.members?.some((m) => m.member_id === member?.id) ?? false;
          const canManage = isOwnEntry || isAdmin;
          const isAssigned = entry.status === 'assigned';
          const canJoin = !isInQueue && memberCount < 4 && !isAssigned;
          const canAddMembers = canManage && memberCount < 4 && !isAssigned;
          const createdTime = new Date(entry.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

          // 4개 슬롯 만들기
          const slots = Array.from({ length: 4 }, (_, i) => {
            const qm = entry.members?.[i];
            return qm ?? null;
          });

          return (
            <div
              key={entry.id}
              className={`rounded-2xl bg-white border p-4 transition-all ${
                isAssigned ? 'border-indigo-400 shadow-md shadow-indigo-500/10' :
                isOwnEntry ? 'border-indigo-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* 순위 */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-2xl font-bold text-indigo-600">{index + 1}</span>
                  <span className="text-xs text-gray-400">순위</span>
                </div>

                {/* 멤버 슬롯 */}
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
                  {slots.map((qm, i) => {
                    if (qm) {
                      const isMe = qm.member_id === member?.id;
                      const isCreator = qm.is_creator;
                      return (
                        <div
                          key={qm.member_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm shrink-0 ${
                            isMe ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            isMe ? 'bg-indigo-500' : 'bg-gray-400'
                          }`}>
                            {qm.member?.name?.charAt(0) ?? '?'}
                          </div>
                          {qm.member?.name ?? '??'}
                          {isMe && ' (나)'}
                          {isCreator && ' 👑'}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`empty-${i}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-50 text-gray-300 border border-dashed border-gray-200 shrink-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        </div>
                        비어있음
                      </div>
                    );
                  })}
                </div>

                {/* 우측 정보 + 액션 */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-600">
                      👥 {memberCount} / 4 모집 중
                    </div>
                    {entry.preferred_court && (
                      <div className="text-xs text-indigo-500 font-medium">
                        🏟 {entry.preferred_court.name}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">{createdTime}</div>
                  </div>

                  {canManage ? (
                    <div className="flex gap-1.5">
                      {canAddMembers && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1"
                          onClick={() => openAddDialog(entry.id)}
                        >
                          + 인원추가
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1"
                        onClick={() => handleCancel(entry.id)}
                        disabled={loadingId === entry.id}
                      >
                        대기 취소
                      </Button>
                    </div>
                  ) : canJoin ? (
                    <Button
                      size="sm"
                      className="rounded-full gap-1"
                      onClick={() => handleJoin(entry.id)}
                      disabled={loadingId === entry.id}
                    >
                      + 참가하기
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 인원추가 다이얼로그 */}
      <Dialog open={!!addDialogEntryId} onOpenChange={(v) => { if (!v) setAddDialogEntryId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>인원 추가하기</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              추가할 멤버를 선택하세요 ({selectedIds.length}/{maxAdd})
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {availableMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`w-full text-left p-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                    selectedIds.includes(m.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleMember(m.id)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${m.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {m.name}
                </button>
              ))}
              {availableMembers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">추가할 수 있는 멤버가 없습니다.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogEntryId(null)}>
              취소
            </Button>
            <Button onClick={handleAddMembers} disabled={submitting || selectedIds.length === 0}>
              {submitting ? '추가 중...' : `${selectedIds.length}명 추가`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
