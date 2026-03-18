import { create } from 'zustand';
import type { Court } from '@/types';

interface CourtState {
  readonly courts: readonly Court[];
  readonly setCourts: (courts: readonly Court[]) => void;
  readonly updateCourt: (id: string, updates: Partial<Court>) => void;
}

export const useCourtStore = create<CourtState>((set) => ({
  courts: [],
  setCourts: (courts) => set({ courts }),
  updateCourt: (id, updates) =>
    set((state) => ({
      courts: state.courts.map((court) =>
        court.id === id ? { ...court, ...updates } : court
      ),
    })),
}));
