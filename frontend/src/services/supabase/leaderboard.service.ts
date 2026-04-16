import { LeaderboardEntry } from "@shared/types/domain";
import { supabase } from "./client";

export const leaderboardService = {
  async getLeaderboard(seasonId: number | null) {
    const { data, error } = await supabase.rpc("get_leaderboard", {
      p_season_id: seasonId === null ? null : seasonId
    });
    if (error) throw error;
    return (data ?? []) as LeaderboardEntry[];
  }
};
