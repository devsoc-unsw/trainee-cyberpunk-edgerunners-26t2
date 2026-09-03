import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';

type LeaderboardRow = Database['public']['Functions']['get_leaderboard']['Returns'][number];

export type LeaderboardEntry = {
  profileId: string;
  username: string;
  rank: number;
  settledProfit: number;
  settledCount: number;
  isCurrentUser: boolean;
};

function toLeaderboardEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    profileId: row.profile_id,
    username: row.username,
    rank: row.rank,
    settledProfit: row.settled_profit,
    settledCount: row.settled_count,
    isCurrentUser: row.is_current_user,
  };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard');

  if (error) throw error;

  return (data ?? []).map(toLeaderboardEntry);
}
