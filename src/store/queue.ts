import { create } from 'zustand';
import type { QueueEntry } from '@/types';

interface QueueState {
  readonly entries: readonly QueueEntry[];
  readonly setEntries: (entries: readonly QueueEntry[]) => void;
  readonly addEntry: (entry: QueueEntry) => void;
  readonly updateEntry: (id: string, updates: Partial<QueueEntry>) => void;
  readonly removeEntry: (id: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) =>
    set((state) => ({ entries: [...state.entries, entry] })),
  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
}));
