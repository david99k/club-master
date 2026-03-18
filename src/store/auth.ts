import { create } from 'zustand';
import type { Member } from '@/types';

interface AuthState {
  readonly member: Member | null;
  readonly isLoading: boolean;
  readonly setMember: (member: Member | null) => void;
  readonly setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  member: null,
  isLoading: true,
  setMember: (member) => set({ member }),
  setLoading: (isLoading) => set({ isLoading }),
}));
