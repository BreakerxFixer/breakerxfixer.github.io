import { PlatformChallenge } from "@shared/types/domain";
import { apiRequest } from "./client";

type CatalogResponse = { items: PlatformChallenge[] };
type ProgressResponse = {
  user_id: string;
  total_points: number;
  solves: Array<{ challenge_id: string; points_awarded: number; solved_at: string }>;
};

export const platformService = {
  async getCatalog(track?: "ctf" | "learn", seasonId?: number) {
    const qs = new URLSearchParams();
    if (track) qs.set("track", track);
    if (typeof seasonId === "number") qs.set("season_id", String(seasonId));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const data = await apiRequest<CatalogResponse>(`/catalog${suffix}`);
    return data.items;
  },

  async getUserProgress(userId: string) {
    return apiRequest<ProgressResponse>("/user-progress", {
      headers: { "X-User-Id": userId }
    });
  },

  async submitChallenge(userId: string, payload: { challenge_id: string; value: string; session_id?: string }) {
    return apiRequest<{ success: boolean; message: string; points_earned?: number }>("/submit-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId
      },
      body: JSON.stringify(payload)
    });
  },

  async startLearnSession(userId: string, challengeId: string) {
    return apiRequest<{ session_id: string; challenge_id: string; expires_at: number }>("/learn-session/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId
      },
      body: JSON.stringify({ challenge_id: challengeId })
    });
  },

  async leaderboard(limit = 100) {
    const data = await apiRequest<{ items: Array<{ user_id: string; points: number; rank: number }> }>(
      `/leaderboard?limit=${Math.min(Math.max(1, limit), 200)}`
    );
    return data.items;
  },

  async resetTotal(userId: string, scope: "all" | "ctf" | "learn" = "all") {
    return apiRequest<{ ok: boolean; scope: string }>("/reset-total", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId
      },
      body: JSON.stringify({ scope })
    });
  }
};
