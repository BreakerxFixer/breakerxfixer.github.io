import { useEffect, useMemo, useState } from "react";
import { Card } from "@shared/ui/Card";
import { Tabs } from "@shared/ui/Tabs";
import { platformService } from "@services/fastapi/platform.service";
import { socialService } from "@services/supabase/social.service";
import { Season } from "@shared/types/domain";
import { useAuthStore } from "@features/auth/auth.store";
import { Button } from "@shared/ui/Button";
import { useI18nStore } from "@features/i18n/i18n.store";

type LeaderboardRow = {
  id: string;
  rank: number;
  points: number;
  username: string;
  avatar_url: string | null;
};

export const LeaderboardPage = () => {
  const session = useAuthStore((s) => s.session);
  const lang = useI18nStore((s) => s.lang);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [busyPeerId, setBusyPeerId] = useState<string | null>(null);

  const tabs = useMemo(
    () => [{ id: "all", label: "ALL_TIME" }, ...seasons.map((s) => ({ id: String(s.id), label: s.name.toUpperCase() }))],
    [seasons]
  );

  useEffect(() => {
    void platformService.getCatalog("ctf").then((items) => {
      const seasonIds = Array.from(new Set(items.map((i) => i.season_id))).sort((a, b) => a - b);
      setSeasons(
        seasonIds.map((id) => ({
          id,
          name: `Season ${id}`,
          description: null,
          is_active: true
        }))
      );
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      const board = await platformService.leaderboard(100);
      const ids = board.map((r) => r.user_id);
      const profiles = await socialService.getPeerProfiles(ids);
      const normalized = board.map((entry) => {
        const profile = profiles.find((p) => p.id === entry.user_id);
        return {
          id: entry.user_id,
          rank: entry.rank,
          points: Number(entry.points),
          username: profile?.username || "ENTITY",
          avatar_url: profile?.avatar_url || null
        };
      });
      setRows(normalized);
    };
    void load();
  }, [seasonFilter]);

  const addFriend = async (peerId: string) => {
    if (!session) return;
    setBusyPeerId(peerId);
    try {
      await socialService.sendFriendRequest(session.user.id, peerId);
    } finally {
      setBusyPeerId(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", marginBottom: 0 }}>Global Leaderboard</h2>
        <Tabs value={seasonFilter} onChange={setSeasonFilter} options={tabs} />
      </div>

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ paddingBottom: ".5rem" }}>Rank</th>
              <th>Entity</th>
              <th>Points</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const mine = session?.user.id === row.id;
              return (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: ".6rem 0" }}>#{row.rank || index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--border-default)" }}>
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt={row.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: ".75rem" }}>👾</div>
                        )}
                      </div>
                      <span>{mine ? `${row.username} (${lang === "es" ? "Tu" : "You"})` : row.username}</span>
                    </div>
                  </td>
                  <td>{Number(row.points).toLocaleString()} PTS</td>
                  <td style={{ textAlign: "right" }}>
                    {!mine && session ? (
                      <Button disabled={busyPeerId === row.id} onClick={() => void addFriend(row.id)}>
                        + Add
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
