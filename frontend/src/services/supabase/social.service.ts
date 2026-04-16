import { Friendship, Profile } from "@shared/types/domain";
import { supabase } from "./client";

export const socialService = {
  async getFriendships() {
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Friendship[];
  },

  async getPeerProfiles(ids: string[]) {
    if (!ids.length) return [] as Profile[];
    const { data, error } = await supabase.from("profiles").select("id, username, avatar_url, points").in("id", ids);
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async sendFriendRequest(myId: string, peerId: string) {
    const { error } = await supabase.from("friendships").insert({
      requester_id: myId,
      addressee_id: peerId,
      status: "pending"
    });
    if (error) throw error;
  },

  async respondFriendRequest(friendshipId: number, action: "accept" | "decline") {
    const { data, error } = await supabase.rpc("respond_friend_request", {
      p_friendship_id: friendshipId,
      p_action: action
    });
    if (error) throw error;
    return data as { ok: boolean; error?: string };
  },

  async deleteFriendship(friendshipId: number) {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) throw error;
  }
};
