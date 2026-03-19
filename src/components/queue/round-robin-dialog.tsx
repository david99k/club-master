'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useClubStore } from '@/store/club';
import { createRoundRobin } from '@/lib/actions/round-robin';
import type { Member } from '@/types';

interface RoundRobinDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function RoundRobinDialog({ open, onOpenChange }: RoundRobinDialogProps) {
  const { activeClub } = useClubStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !activeClub) return;
    const supabase = createClient();
    supabase
      .from('club_members')
      .select('member:members(*)')
      .eq('club_id', activeClub.id)
      .eq('status', 'approved')
      .then(({ data }) => {
        const onlineMembers = (data as unknown as { member: Member | null }[] ?? [])
          .map((cm) => cm.member)
          .filter((m): m is Member => m !== null && m.is_online)
          .sort((a, b) => a.name.localeCompare(b.name));
        setMembers(onlineMembers);
        setSelected(new Set(onlineMembers.map((m) => m.id)));
      });
  }, [open, activeClub]);

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(members.map((m) => m.id)));
  const deselectAll = () => setSelected(new Set());

  const groupCount = useMemo(() => Math.floor(selected.size / 4), [selected.size]);
  const remainder = useMemo(() => selected.size % 4, [selected.size]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createRoundRobin(Array.from(selected));
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>랜덤 플레이 (라운드 로빈)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              참여 인원: {selected.size}명 / {groupCount}팀
              {remainder > 0 && ` (+${remainder}명)`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                전체 선택
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                전체 해제
              </Button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                  selected.has(m.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleMember(m.id)}
              >
                {m.name}
              </button>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                온라인 대기자가 없습니다.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selected.size < 4}
          >
            {isSubmitting ? '배정 중...' : '참여인원 설정완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
