'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { updateMatchWaitSeconds } from '@/lib/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminSettingsPage() {
  const { matchWaitSeconds } = useSettingsStore();
  const [minutes, setMinutes] = useState(() => Math.floor(matchWaitSeconds / 60));
  const [seconds, setSeconds] = useState(() => matchWaitSeconds % 60);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalSeconds = minutes * 60 + seconds;
  const isChanged = totalSeconds !== matchWaitSeconds;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await updateMatchWaitSeconds(totalSeconds);
      if (result.error) {
        alert(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">운영 설정</h2>
        <p className="text-sm text-gray-500 mt-1">클럽 운영에 필요한 설정을 관리합니다</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-sm sm:text-base">경기 대기 시간</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            코트 배정 후 자동으로 경기가 시작되기까지의 대기 시간입니다.
            대기 시간이 지나면 자동으로 플레이가 시작됩니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={10}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(10, Number(e.target.value))))}
              className="w-20 text-center rounded-xl h-11"
            />
            <span className="text-sm text-gray-500">분</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
              className="w-20 text-center rounded-xl h-11"
            />
            <span className="text-sm text-gray-500">초</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            현재 설정: {Math.floor(matchWaitSeconds / 60)}분 {matchWaitSeconds % 60}초
          </div>
          {isChanged && (
            <div className="text-xs text-amber-600 font-medium">
              → 변경: {minutes}분 {seconds}초
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !isChanged || totalSeconds < 30}
          className="rounded-xl"
        >
          {saving ? '저장 중...' : saved ? '저장 완료!' : '저장'}
        </Button>

        {totalSeconds < 30 && (
          <p className="text-xs text-red-500">최소 30초 이상으로 설정해주세요.</p>
        )}
      </div>
    </div>
  );
}
