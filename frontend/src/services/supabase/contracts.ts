import { Challenge, LeaderboardEntry, Season } from "@shared/types/domain";

export type SubmitFlagResponse = {
  success: boolean;
  message: string;
  points_earned?: number;
};

export type SocialRpcResponse = {
  ok: boolean;
  error?: string;
  hint?: string;
  id?: number;
};

export type SeasonsResponse = Season[];
export type LeaderboardResponse = LeaderboardEntry[];
export type ChallengesResponse = Challenge[];
