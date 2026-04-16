import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@features/auth/auth.store";
import { chatService } from "@services/supabase/chat.service";
import { socialService } from "@services/supabase/social.service";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";

type FriendView = {
  friendshipId: number;
  peerId: string;
  username: string;
  status: "pending" | "accepted";
  isIncoming: boolean;
};

export const SocialWidget = () => {
  const session = useAuthStore((s) => s.session);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [activePeer, setActivePeer] = useState<FriendView | null>(null);
  const [messages, setMessages] = useState<{ sender_id: string; content: string; created_at: string }[]>([]);
  const [messageText, setMessageText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const allFriendships = await socialService.getFriendships();
      const peerIds = new Set<string>();
      allFriendships.forEach((f) => {
        peerIds.add(f.requester_id === session.user.id ? f.addressee_id : f.requester_id);
      });
      const peers = await socialService.getPeerProfiles(Array.from(peerIds));
      const mapped: FriendView[] = allFriendships.map((f) => {
        const peerId = f.requester_id === session.user.id ? f.addressee_id : f.requester_id;
        const peer = peers.find((p) => p.id === peerId);
        return {
          friendshipId: f.id,
          peerId,
          username: peer?.username ?? "Entity",
          status: f.status,
          isIncoming: f.addressee_id === session.user.id
        };
      });
      setFriends(mapped);
    };
    void load();
  }, [session]);

  useEffect(() => {
    if (!session || !activePeer) return;
    void chatService.getConversation(session.user.id, activePeer.peerId).then((data) => setMessages(data));
    void chatService.markConversationAsRead(session.user.id, activePeer.peerId);
  }, [activePeer, session]);

  const requests = useMemo(() => friends.filter((f) => f.status === "pending"), [friends]);
  const accepted = useMemo(() => friends.filter((f) => f.status === "accepted"), [friends]);

  if (!session) return null;

  const sendMessage = async () => {
    if (!activePeer || !messageText.trim() || !session) return;
    setBusy(true);
    try {
      const result = await chatService.sendMessage(activePeer.peerId, messageText.trim());
      if (!result.ok) return;
      const updated = await chatService.getConversation(session.user.id, activePeer.peerId);
      setMessages(updated);
      setMessageText("");
    } finally {
      setBusy(false);
    }
  };

  const respond = async (friendshipId: number, action: "accept" | "decline") => {
    await socialService.respondFriendRequest(friendshipId, action);
    const updated = await socialService.getFriendships();
    setFriends((prev) =>
      prev.map((item) => {
        const match = updated.find((f) => f.id === item.friendshipId);
        if (!match) return item;
        return { ...item, status: match.status };
      })
    );
  };

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 95 }}>
      <Button variant="primary" onClick={() => setOpen((v) => !v)}>
        Social ({requests.length})
      </Button>
      {open ? (
        <div className="panel" style={{ width: 330, marginTop: 8, padding: "0.75rem", maxHeight: "70vh", overflow: "auto" }}>
          {activePeer ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong>{activePeer.username}</strong>
                <Button onClick={() => setActivePeer(null)}>Back</Button>
              </div>
              <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.6rem" }}>
                {messages.map((m) => (
                  <div key={`${m.created_at}-${m.sender_id}`} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                <Button disabled={busy} onClick={() => void sendMessage()}>
                  Send
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">Requests</div>
              {requests.length ? (
                requests.map((r) => (
                  <div key={r.friendshipId} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span>{r.username}</span>
                    {r.isIncoming ? (
                      <span style={{ display: "flex", gap: "0.3rem" }}>
                        <Button onClick={() => void respond(r.friendshipId, "accept")}>Accept</Button>
                        <Button variant="danger" onClick={() => void respond(r.friendshipId, "decline")}>
                          Decline
                        </Button>
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>Pending</span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>No pending requests.</div>
              )}

              <div className="section-title" style={{ marginTop: "0.9rem" }}>
                Friends
              </div>
              {accepted.length ? (
                accepted.map((f) => (
                  <div key={f.friendshipId} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span>{f.username}</span>
                    <Button onClick={() => setActivePeer(f)}>Chat</Button>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>No friends yet.</div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
