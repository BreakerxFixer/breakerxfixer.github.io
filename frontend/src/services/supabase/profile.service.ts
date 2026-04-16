import { Profile } from "@shared/types/domain";
import { supabase } from "./client";

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
    if (error) throw error;
    return data;
  },

  async getRankingSnapshot() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, points")
      .order("points", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async updateAvatar(userId: string, file: File) {
    const ext = (file.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    const bucket = supabase.storage.from("avatars");

    const { data: current } = await bucket.list(userId);
    if (current?.length) {
      await bucket.remove(current.map((f) => `${userId}/${f.name}`));
    }

    const { error: uploadError } = await bucket.upload(path, file, { cacheControl: "60", contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicData } = bucket.getPublicUrl(path);
    const avatarUrl = publicData.publicUrl;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    if (updateError) throw updateError;
    return avatarUrl;
  },

  async deleteAccount() {
    const { error } = await supabase.rpc("delete_user_data");
    if (error) throw error;
  }
};
