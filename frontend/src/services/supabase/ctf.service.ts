import { Challenge, Season } from "@shared/types/domain";
import { getMissionOrder } from "@shared/lib/format";
import { supabase } from "./client";
import { SubmitFlagResponse } from "./contracts";

export const ctfService = {
  async getSeasons() {
    const { data, error } = await supabase.rpc("get_seasons");
    if (error) throw error;
    return (data ?? []) as Season[];
  },

  async getChallenges() {
    const { data, error } = await supabase
      .from("challenges")
      .select("id,title,category,difficulty,points,description_en,description_es,season_id");
    if (error) throw error;
    const challenges = (data ?? []) as Challenge[];
    return challenges.sort((a, b) => {
      if (a.season_id !== b.season_id) return a.season_id - b.season_id;
      return getMissionOrder(a.id) - getMissionOrder(b.id);
    });
  },

  async getSolvedIds(userId: string) {
    const { data, error } = await supabase.from("solves").select("challenge_id").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((row) => String(row.challenge_id));
  },

  async submitFlag(challengeId: string, submittedFlag: string) {
    const { data, error } = await supabase.rpc("submit_flag", {
      challenge_id_param: challengeId,
      submitted_flag: submittedFlag
    });
    if (error) throw error;
    return data as SubmitFlagResponse;
  }
};
