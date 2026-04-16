import { Message } from "@shared/types/domain";
import { supabase } from "./client";

export const chatService = {
  async getConversation(myId: string, peerId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("id,sender_id,receiver_id,content,created_at,read_at")
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${myId})`)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) throw error;
    return (data ?? []) as Message[];
  },

  async sendMessage(receiverId: string, content: string) {
    const { data, error } = await supabase.rpc("send_message", {
      p_receiver_id: receiverId,
      p_content: content
    });
    if (error) throw error;
    return data as { ok: boolean; id?: number; hint?: string; error?: string };
  },

  async markConversationAsRead(myId: string, peerId: string) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("receiver_id", myId)
      .eq("sender_id", peerId);
    if (error) throw error;
  }
};
