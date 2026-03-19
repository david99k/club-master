'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useClubStore } from '@/store/club';
import { approveJoinRequest, rejectJoinRequest } from '@/lib/actions/club';
import { formatPhone } from '@/lib/utils';
import type { ClubMember } from '@/types';

export default function AdminRequestsPage() {
  const { activeClub } = useClubStore();
  const [requests, setRequests] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!activeClub) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('club_members')
      .select('*, member:members(*)')
      .eq('club_id', activeClub.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as unknown as ClubMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [activeClub]);

  // 실시간 구독
  useEffect(() => {
    if (!activeClub) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`requests-${activeClub.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'club_members',
        filter: `club_id=eq.${activeClub.id}`,
      }, () => loadRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeClub]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const result = await approveJoinRequest(id);
    if (result.error) {
      alert(result.error);
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!confirm('가입 요청을 거절하시겠습니까?')) return;
    setProcessingId(id);
    const result = await rejectJoinRequest(id);
    if (result.error) {
      alert(result.error);
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          가입 요청 ({requests.length}건)
        </h3>

        {requests.length === 0 ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center">
            <div className="text-gray-300 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 mx-auto">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">대기 중인 가입 요청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const reqMember = req.member;
              const requestDate = new Date(req.created_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={req.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                        {reqMember?.name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{reqMember?.name ?? '알 수 없음'}</p>
                        <p className="text-xs text-gray-400">
                          {reqMember?.phone ? formatPhone(reqMember.phone) : '연락처 없음'}
                          <span className="mx-1">·</span>
                          {requestDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => handleApprove(req.id)}
                        disabled={processingId === req.id}
                      >
                        승인
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-300 text-red-500 hover:bg-red-50 text-xs"
                        onClick={() => handleReject(req.id)}
                        disabled={processingId === req.id}
                      >
                        거절
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
