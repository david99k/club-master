import { create } from 'zustand';

interface SettingsState {
  readonly matchWaitSeconds: number;
  readonly setMatchWaitSeconds: (seconds: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  matchWaitSeconds: 120,
  setMatchWaitSeconds: (seconds) => set({ matchWaitSeconds: seconds }),
}));
