'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addMember, deleteMember } from '@/lib/actions/member';
import { formatPhone, stripPhone } from '@/lib/utils';
import type { Member, MemberRole } from '@/types';

const ROLE_OPTIONS: { value: MemberRole; label: string; color: string }[] = [
  { value: 'admin', label: '관리자', color: 'bg-red-500' },
  { value: 'sub_admin', label: '부관리자', color: 'bg-amber-500' },
  { value: 'user', label: '일반회원', color: 'bg-gray-400' },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const loadMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setMembers(data as Member[]);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    const supabase = createClient();
    await supabase.from('members').update({ role }).eq('id', memberId);
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m))
    );
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const digits = stripPhone(newPhone);
    const result = await addMember(newName.trim(), digits || undefined);
    if (result.error) {
      alert(result.error);
    } else {
      setNewName('');
      setNewPhone('');
      await loadMembers();
    }
    setAdding(false);
  };

  const handleDelete = async (memberId: string, memberName: string) => {
    if (!confirm(`"${memberName}" 회원을 삭제하시겠습니까?`)) return;
    const result = await deleteMember(memberId);
    if (result.error) {
      alert(result.error);
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  return (
    <div className="space-y-5">
      {/* 회원 추가 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="text-primary">+</span> 회원 추가
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="rounded-xl h-11"
          />
          <Input
            placeholder="전화번호 (선택)"
            value={newPhone}
            onChange={(e) => setNewPhone(formatPhone(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="rounded-xl h-11"
            inputMode="numeric"
          />
          <Button onClick={handleAdd} disabled={adding} className="rounded-xl h-11 px-6 shrink-0">
            추가
          </Button>
        </div>
      </div>

      {/* 회원 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">로딩 중...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="rounded-2xl bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                      {member.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      member.is_online ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-gray-400">
                      {member.is_online ? (
                        <span className="text-green-500">온라인</span>
                      ) : '오프라인'}
                      {member.phone && ` · ${formatPhone(member.phone)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value as MemberRole)}
                  >
                    <SelectTrigger className="w-[120px] rounded-xl">
                      <SelectValue>
                        {(value: string) => {
                          const opt = ROLE_OPTIONS.find((o) => o.value === value);
                          return opt?.label ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
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
                    onClick={() => handleDelete(member.id, member.name)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-12 text-center">
              <div className="text-gray-300 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 mx-auto">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-gray-500">등록된 회원이 없습니다</p>
              <p className="text-gray-400 text-sm mt-1">위에서 회원을 추가해주세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
