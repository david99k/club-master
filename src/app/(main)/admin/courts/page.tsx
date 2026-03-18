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

      {/* 코트 목록 */}
      <div className="space-y-3">
        {courts.map((court) => {
          const statusOpt = STATUS_OPTIONS.find((o) => o.value === court.status);
          return (
            <div key={court.id} className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className={`h-1 ${statusOpt?.color ?? 'bg-gray-400'}`} />
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${statusOpt?.color ?? 'bg-gray-400'}`}>
                    {court.name.charAt(0)}
                  </div>
                  {editingId === court.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-40 rounded-lg"
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(court.id)}
                      />
                      <Button size="sm" className="rounded-lg" onClick={() => handleUpdateName(court.id)}>저장</Button>
                      <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setEditingId(null)}>취소</Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold hover:text-primary transition-colors"
                      onClick={() => { setEditingId(court.id); setEditName(court.name); }}
                    >
                      {court.name}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={court.status}
                    onValueChange={(value) => updateCourtStatus(court.id, value as CourtStatus)}
                  >
                    <SelectTrigger className="w-[120px] rounded-xl">
                      <SelectValue>
                        {(value: string) => {
                          const opt = STATUS_OPTIONS.find((o) => o.value === value);
                          return opt?.label ?? value;
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(court.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {courts.length === 0 && (
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-12 text-center">
            <div className="text-gray-300 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 mx-auto">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 12h18" />
                <path d="M12 3v18" />
              </svg>
            </div>
            <p className="text-gray-500">아직 등록된 코트가 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">위에서 코트를 추가해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
