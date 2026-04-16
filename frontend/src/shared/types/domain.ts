export type Language = "en" | "es";

export type Profile = {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
};

export type Challenge = {
  id: string;
  track_id?: "ctf" | "learn";
  title: string;
  category: string;
  difficulty: string;
  points: number;
  description_en: string | null;
  description_es: string | null;
  season_id: number;
};

export type Season = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
};

export type PlatformChallenge = {
  id: string;
  track_id: "ctf" | "learn";
  season_id: number;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  category: string;
  difficulty: "easy" | "medium" | "hard" | "insane";
  points: number;
  sort_order: number;
  assets: Array<{
    id: number;
    asset_type: "file" | "url" | "terminal_lesson" | "instructions";
    label: string;
    payload: Record<string, unknown>;
    order_index: number;
  }>;
};

export type Friendship = {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

export type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
};
