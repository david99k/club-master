'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeMatch } from '@/lib/actions/match';
import type { MatchPlayer } from '@/types';

interface CompleteMatchDialogProps {
  readonly matchId: string;
  readonly players?: readonly MatchPlayer[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CompleteMatchDialog({
  matchId,
  players,
  open,
  onOpenChange,
}: CompleteMatchDialogProps) {
  const teamANames = players?.filter((p) => p.team === 'A').map((p) => p.member?.name ?? '?').join(', ') ?? '';
  const teamBNames = players?.filter((p) => p.team === 'B').map((p) => p.member?.name ?? '?').join(', ') ?? '';
  const [teamAScore, setTeamAScore] = useState('');
  const [teamBScore, setTeamBScore] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async (withScore: boolean) => {
    setIsSubmitting(true);
    try {
      if (withScore && teamAScore && teamBScore) {
        await completeMatch(matchId, parseInt(teamAScore), parseInt(teamBScore));
      } else {
        await completeMatch(matchId);
      }
      onOpenChange(false);
      setTeamAScore('');
      setTeamBScore('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>시합 완료</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          스코어를 입력하시겠습니까? (선택 사항)
        </p>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teamA">A팀 점수</Label>
            {teamANames && (
              <p className="text-xs text-muted-foreground">{teamANames}</p>
            )}
            <Input
              id="teamA"
              type="number"
              min="0"
              value={teamAScore}
              onChange={(e) => setTeamAScore(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamB">B팀 점수</Label>
            {teamBNames && (
              <p className="text-xs text-muted-foreground">{teamBNames}</p>
            )}
            <Input
              id="teamB"
              type="number"
              min="0"
              value={teamBScore}
              onChange={(e) => setTeamBScore(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleComplete(false)}
            disabled={isSubmitting}
          >
            점수 없이 완료
          </Button>
          <Button
            onClick={() => handleComplete(true)}
            disabled={isSubmitting || !teamAScore || !teamBScore}
          >
            점수 입력 후 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
