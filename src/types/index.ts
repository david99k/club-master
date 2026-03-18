// ============================================
// 클럽 코트 운영사이트 - 타입 정의
// ============================================

export type MemberRole = 'admin' | 'sub_admin' | 'user';
export type CourtStatus = 'operating' | 'repairing' | 'waiting' | 'lesson';
export type QueueEntryStatus = 'waiting' | 'assigned' | 'playing' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'playing' | 'completed';
export type Team = 'A' | 'B';

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: MemberRole;
  readonly is_online: boolean;
  readonly last_location_lat: number | null;
  readonly last_location_lng: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Court {
  readonly id: string;
  readonly name: string;
  readonly status: CourtStatus;
  readonly display_order: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface QueueEntry {
  readonly id: string;
  readonly court_preference_id: string | null;
  readonly status: QueueEntryStatus;
  readonly created_at: string;
  readonly updated_at: string;
  readonly members?: readonly QueueMember[];
  readonly preferred_court?: Court | null;
}

export interface QueueMember {
  readonly id: string;
  readonly queue_entry_id: string;
  readonly member_id: string;
  readonly is_creator: boolean;
  readonly joined_at: string;
  readonly member?: Member;
}

export interface Match {
  readonly id: string;
  readonly court_id: string;
  readonly queue_entry_id: string | null;
  readonly status: MatchStatus;
  readonly started_at: string | null;
  readonly ended_at: string | null;
  readonly created_at: string;
  readonly court?: Court;
  readonly players?: readonly MatchPlayer[];
  readonly score?: Score | null;
}

export interface MatchPlayer {
  readonly id: string;
  readonly match_id: string;
  readonly member_id: string;
  readonly team: Team;
  readonly member?: Member;
}

export interface Score {
  readonly id: string;
  readonly match_id: string;
  readonly team_a_score: number;
  readonly team_b_score: number;
  readonly created_at: string;
}

export interface MemberStats {
  readonly member_id: string;
  readonly member_name: string;
  readonly total_matches: number;
  readonly wins: number;
  readonly losses: number;
  readonly period: string;
}
