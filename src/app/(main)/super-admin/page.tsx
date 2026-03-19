'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  readonly totalClubs: number;
  readonly totalMembers: number;
  readonly activeClubs: number;
  readonly onlineMembers: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClubs: 0,
    totalMembers: 0,
    activeClubs: 0,
    onlineMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadStats = async () => {
      const [clubs, members, activeClubs, onlineMembers] = await Promise.all([
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_online', true),
      ]);

      setStats({
        totalClubs: clubs.count ?? 0,
        totalMembers: members.count ?? 0,
        activeClubs: activeClubs.count ?? 0,
        onlineMembers: onlineMembers.count ?? 0,
      });
      setLoading(false);
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: '전체 클럽', value: stats.totalClubs, icon: '🏢', color: 'bg-indigo-50 text-indigo-700' },
    { label: '활성 클럽', value: stats.activeClubs, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: '전체 회원', value: stats.totalMembers, icon: '👥', color: 'bg-violet-50 text-violet-700' },
    { label: '온라인', value: stats.onlineMembers, icon: '🟢', color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 ${card.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-xs font-medium opacity-80">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
