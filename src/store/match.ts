import { create } from 'zustand';
import type { Match } from '@/types';

interface MatchState {
  readonly matches: readonly Match[];
  readonly setMatches: (matches: readonly Match[]) => void;
  readonly updateMatch: (id: string, updates: Partial<Match>) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  setMatches: (matches) => set({ matches }),
  updateMatch: (id, updates) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
}));
