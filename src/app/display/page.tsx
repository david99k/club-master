'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import type { Court, QueueEntry, Match } from '@/types';

export default function DisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>로딩 중...</p></div>}>
      <DisplayContent />
    </Suspense>
  );
}

function DisplayContent() {
  const searchParams = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [clubName, setClubName] = useState<string>('');
  const [courts, setCourts] = useState<Court[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    if (!clubId) return;
    const supabase = createClient();

    // 클럽명 로드
    supabase.from('clubs').select('name').eq('id', clubId).single().then(({ data }) => {
      if (data) setClubName(data.name);
    });

    const loadAll = async () => {
      const [courtsRes, queueRes, matchesRes] = await Promise.all([
        supabase.from('courts').select('*').eq('club_id', clubId).order('display_order'),
        supabase.from('queue_entries').select(`
          *, members:queue_members(*, member:members(*))
        `).eq('club_id', clubId).in('status', ['waiting', 'assigned']).order('created_at'),
        supabase.from('matches').select(`
          *, court:courts(*), players:match_players(*, member:members(*))
        `).eq('club_id', clubId).in('status', ['pending', 'playing']).order('created_at'),
      ]);

      if (courtsRes.data) setCourts(courtsRes.data as Court[]);
      if (queueRes.data) setQueue(queueRes.data as QueueEntry[]);
      if (matchesRes.data) setMatches(matchesRes.data as Match[]);
    };

    loadAll();

    const channel = supabase
      .channel(`display-realtime-${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts', filter: `club_id=eq.${clubId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `club_id=eq.${clubId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_members' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `club_id=eq.${clubId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={`min-h-screen bg-background p-4 ${isLandscape ? 'flex gap-4' : ''}`}>
      {/* 가로 모드: 왼쪽에 QR */}
      {isLandscape && (
        <div className="flex flex-col items-center justify-center w-48 shrink-0">
          <QRCodeSVG value={siteUrl} size={160} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            QR 스캔하여 참여하기
          </p>
        </div>
      )}

      <div className="flex-1 space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {clubName || '클럽 코트'}
          </h1>
        </div>

        {/* 코트 현황 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">코트 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {courts.map((court) => {
              const activeMatch = matches.find(
                (m) => m.court_id === court.id
              );
              return (
                <Card
                  key={court.id}
                  className={activeMatch ? 'border-primary' : court.status === 'repairing' ? 'opacity-50' : ''}
                >
                  <CardHeader className="pb-1 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{court.name}</CardTitle>
                      <Badge
                        variant={
                          court.status === 'operating' ? 'default'
                            : court.status === 'repairing' ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {court.status === 'operating' ? '운영' : court.status === 'repairing' ? '수리' : '대기'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {activeMatch ? (
                      <div className="space-y-1">
                        <Badge
                          variant={activeMatch.status === 'playing' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activeMatch.status === 'pending' ? '대기' : '플레이 중'}
                        </Badge>
                        <div className="text-xs">
                          {activeMatch.players?.map((p) => p.member?.name).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">비어 있음</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 대기열 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            대기열 ({queue.filter((q) => q.status === 'waiting').length}팀)
          </h2>
          <div className="space-y-2">
            {queue
              .filter((q) => q.status === 'waiting')
              .map((entry, index) => (
                <Card key={entry.id}>
                  <CardContent className="flex items-center gap-3 py-2 px-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <span className="text-sm">
                      {entry.members?.map((m) => m.member?.name).join(', ')}
                    </span>
                    <Badge variant={(entry.members?.length ?? 0) >= 4 ? 'default' : 'secondary'} className="text-xs">
                      {entry.members?.length ?? 0}/4
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            {queue.filter((q) => q.status === 'waiting').length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                대기열이 비어 있습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
