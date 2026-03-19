import { create } from 'zustand';
import type { Club, ClubMember } from '@/types';

interface ClubState {
  readonly activeClub: Club | null;
  readonly clubMembership: ClubMember | null;
  readonly setActiveClub: (club: Club | null) => void;
  readonly setClubMembership: (membership: ClubMember | null) => void;
}

export const useClubStore = create<ClubState>((set) => ({
  activeClub: null,
  clubMembership: null,
  setActiveClub: (activeClub) => set({ activeClub }),
  setClubMembership: (clubMembership) => set({ clubMembership }),
}));
