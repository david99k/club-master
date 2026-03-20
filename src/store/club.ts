import { create } from 'zustand';
import type { Club, ClubMember } from '@/types';

interface ClubState {
  readonly activeClub: Club | null;
  readonly clubMembership: ClubMember | null;
  readonly myClubs: readonly ClubMember[];
  readonly setActiveClub: (club: Club | null) => void;
  readonly setClubMembership: (membership: ClubMember | null) => void;
  readonly setMyClubs: (clubs: readonly ClubMember[]) => void;
  readonly selectClub: (membership: ClubMember) => void;
  readonly clearSelection: () => void;
}

export const useClubStore = create<ClubState>((set) => ({
  activeClub: null,
  clubMembership: null,
  myClubs: [],
  setActiveClub: (activeClub) => set({ activeClub }),
  setClubMembership: (clubMembership) => set({ clubMembership }),
  setMyClubs: (myClubs) => set({ myClubs }),
  selectClub: (membership) => set({
    activeClub: membership.club as Club,
    clubMembership: membership,
  }),
  clearSelection: () => set({ activeClub: null, clubMembership: null }),
}));
