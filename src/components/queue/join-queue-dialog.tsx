'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useCourtStore } from '@/store/court';
import { joinQueue } from '@/lib/actions/queue';
import { useBusyMemberIds } from '@/lib/hooks/use-busy-members';
import type { Member } from '@/types';

interface JoinQueueDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function JoinQueueDialog({ open, onOpenChange }: JoinQueueDialogProps) {
  const { member } = useAuthStore();
  const { courts } = useCourtStore();
  const [allMembers, setAllMembers] = useState<readonly Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [courtPreference, setCourtPreference] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busyIds = useBusyMemberIds();

  const isMeBusy = member ? busyIds.has(member.id) : false;
  const maxSelect = isMeBusy ? 4 : 3;

  useEffect(() => {
    if (!open) return;
    setSelectedMembers([]);
    setCourtPreference('none');
    const supabase = createClient();
    supabase
      .from('members')
      .select('*')
      .neq('id', member?.id ?? '')
      .order('is_online', { ascending: false })
      .order('name')
      .then(({ data }) => {
        if (data) setAllMembers(data as readonly Member[]);
      });
  }, [open, member?.id]);

  const availableMembers = allMembers.filter((m) => !busyIds.has(m.id));

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : prev.length < maxSelect
          ? [...prev, memberId]
          : prev
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await joinQueue(
        selectedMembers,
        courtPreference !== 'none' ? courtPreference : null
      );
      onOpenChange(false);
      setSelectedMembers([]);
      setCourtPreference('none');
    } finally {
      setIsSubmitting(false);
    }
  };

  const operatingCourts = courts.filter((c) => c.status === 'operating');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="text-center px-6 pt-8 pb-0 gap-0 sm:max-w-[420px]">
        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-indigo-600">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">대기 만들기</h3>
        <p className="text-sm text-gray-500 mb-5">함께 할 멤버를 선택하세요</p>

        <div className="space-y-4 text-left">
          {/* 선호 코트 (위로 이동) */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">선호 코트</p>
            <Select value={courtPreference} onValueChange={(value) => setCourtPreference(value ?? 'none')}>
              <SelectTrigger className="w-full rounded-xl h-11">
                <SelectValue placeholder="코트 선택">
                  {(value: string) => {
                    if (!value || value === 'none') return '지정 안 함';
                    return operatingCourts.find((c) => c.id === value)?.name ?? '코트 선택';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">지정 안 함</SelectItem>
                {operatingCourts.map((court) => (
                  <SelectItem key={court.id} value={court.id}>
                    {court.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 본인 상태 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">참여자</p>
            {isMeBusy ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-700">{member?.name}</span>
                <span className="text-xs text-amber-500 ml-auto">플레이중 - 미참여</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                  {member?.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-indigo-700">{member?.name}</span>
                <span className="text-xs text-indigo-400 ml-auto">본인</span>
              </div>
            )}
          </div>

          {/* 멤버 선택 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              멤버 선택 ({selectedMembers.length}/{maxSelect})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-gray-200 p-2">
              {availableMembers.length > 0 ? (
                availableMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                      selectedMembers.includes(m.id)
                        ? 'bg-indigo-500 text-white'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleMember(m.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedMembers.includes(m.id)
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {m.name.charAt(0)}
                    </div>
                    <span>{m.name}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ml-auto ${m.is_online ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">선택할 수 있는 멤버가 없습니다</p>
              )}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="-mx-6 border-t border-gray-200 p-4 flex gap-3 mt-5">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-11"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            className="flex-1 rounded-xl h-11"
            onClick={handleSubmit}
            disabled={isSubmitting || (isMeBusy && selectedMembers.length === 0)}
          >
            {isSubmitting ? '등록 중...' : '대기 등록'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
