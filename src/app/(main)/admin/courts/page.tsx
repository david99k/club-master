'use client';

import { useState } from 'react';
import { useCourtStore } from '@/store/court';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createCourt,
  updateCourtStatus,
  updateCourtName,
  deleteCourt,
} from '@/lib/actions/court';
import type { CourtStatus } from '@/types';

const STATUS_OPTIONS: { value: CourtStatus; label: string; color: string }[] = [
  { value: 'operating', label: '운영중', color: 'bg-green-500' },
  { value: 'lesson', label: '레슨중', color: 'bg-violet-500' },
  { value: 'repairing', label: '수리중', color: 'bg-red-500' },
  { value: 'waiting', label: '대기중', color: 'bg-gray-400' },
];

export default function AdminCourtsPage() {
  const { courts } = useCourtStore();
  const [newCourtName, setNewCourtName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCourt = async () => {
    if (!newCourtName.trim()) return;
    setLoading(true);
    await createCourt(newCourtName.trim());
    setNewCourtName('');
    setLoading(false);
  };

  const handleUpdateName = async (courtId: string) => {
    if (!editName.trim()) return;
    await updateCourtName(courtId, editName.trim());
    setEditingId(null);
  };

  const handleDelete = async (courtId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await deleteCourt(courtId);
  };

  return (
    <div className="space-y-5">
      {/* 코트 추가 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="text-primary">+</span> 코트 추가
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="코트 이름 (예: COURT A)"
            value={newCourtName}
            onChange={(e) => setNewCourtName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCourt()}
            className="rounded-xl h-11"
          />
          <Button onClick={handleCreateCourt} disabled={loading} className="rounded-xl h-11 px-6">
            추가
          </Button>
        </div>
      </div>

      {/* 코트 카드 그리드 (메인 페이지와 동일한 스타일) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {courts.map((court) => {
          const statusOpt = STATUS_OPTIONS.find((o) => o.value === court.status);
          const isEditing = editingId === court.id;

          return (
            <div
              key={court.id}
              className="relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-white transition-all"
            >
              {/* 코트 이름 헤더 */}
              <div className={`px-3 py-1.5 sm:px-4 sm:py-2.5 text-center text-xs sm:text-sm font-bold tracking-wide ${statusOpt?.color ?? 'bg-gray-400'} text-white`}>
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs text-center rounded-lg bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(court.id)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="hover:opacity-80 transition-opacity"
                    onClick={() => { setEditingId(court.id); setEditName(court.name); }}
                  >
                    {court.name.toUpperCase()}
                  </button>
                )}
              </div>

              {/* 내용 */}
              <div className="p-3 sm:p-4 flex flex-col items-center gap-3">
                {/* 상태 아이콘 */}
                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-10 sm:h-10">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  <span className="text-xs sm:text-sm">
                    {court.status === 'operating' ? '운영중' :
                     court.status === 'lesson' ? '레슨중' :
                     court.status === 'repairing' ? '수리중' : '대기중'}
                  </span>
                </div>

                {/* 상태 변경 */}
                <Select
                  value={court.status}
                  onValueChange={(value) => updateCourtStatus(court.id, value as CourtStatus)}
                >
                  <SelectTrigger className="w-full rounded-xl h-9 text-xs">
                    <SelectValue>
                      {(value: string) => {
                        const opt = STATUS_OPTIONS.find((o) => o.value === value);
                        return (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${opt?.color ?? 'bg-gray-400'}`} />
                            {opt?.label ?? value}
                          </div>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 액션 버튼 */}
                <div className="flex gap-1.5 w-full">
                  {isEditing ? (
                    <>
                      <Button size="sm" className="flex-1 rounded-xl text-xs h-8" onClick={() => handleUpdateName(court.id)}>저장</Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs h-8" onClick={() => setEditingId(null)}>취소</Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs h-8"
                        onClick={() => { setEditingId(court.id); setEditName(court.name); }}
                      >
                        이름 수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs h-8 border-red-300 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(court.id)}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {courts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 sm:p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 12h18" />
              <path d="M12 3v18" />
            </svg>
          </div>
          <p className="text-gray-500">등록된 코트가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">위에서 코트를 추가해주세요</p>
        </div>
      )}
    </div>
  );
}
