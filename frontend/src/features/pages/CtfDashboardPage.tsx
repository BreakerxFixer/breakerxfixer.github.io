import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@shared/ui/Card";
import { Tabs } from "@shared/ui/Tabs";
import { Badge } from "@shared/ui/Badge";
import { Button } from "@shared/ui/Button";
import { platformService } from "@services/fastapi/platform.service";
import { BASE_URL } from "@services/fastapi/client";
import { PlatformChallenge } from "@shared/types/domain";
import { useAuthStore } from "@features/auth/auth.store";
import { useI18nStore } from "@features/i18n/i18n.store";

export const CtfDashboardPage = () => {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const lang = useI18nStore((s) => s.lang);
  const [challenges, setChallenges] = useState<PlatformChallenge[]>([]);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [seasons, setSeasons] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "red">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      try {
        const [challengeData, progress] = await Promise.all([
          platformService.getCatalog("ctf"),
          platformService.getUserProgress(session.user.id)
        ]);
        setChallenges(challengeData);
        setSolvedSet(new Set(progress.solves.map((s) => s.challenge_id)));
        setSeasons(
          Array.from(new Set(challengeData.map((c) => Number(c.season_id))))
            .filter((v) => Number.isFinite(v))
            .sort((a, b) => a - b)
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [session]);

  const visibleChallenges = useMemo(
    () => (filter === "all" ? challenges : challenges.filter((c) => c.track_id === "ctf")),
    [challenges, filter]
  );
  const unsolved = useMemo(() => visibleChallenges.filter((c) => !solvedSet.has(c.id)), [visibleChallenges, solvedSet]);
  const activePrimary = unsolved[0] ?? visibleChallenges[0];
  const activeSecondary = unsolved[1] ?? visibleChallenges[1] ?? activePrimary;

  const challengeTitle = (challenge?: PlatformChallenge) =>
    challenge ? (lang === "es" ? challenge.title_es : challenge.title_en) : "No challenge available";
  const challengeDesc = (challenge?: PlatformChallenge) =>
    challenge ? (lang === "es" ? challenge.description_es : challenge.description_en) : "";

  const openChallenge = (challenge: PlatformChallenge) => {
    const encoded = encodeURIComponent(challenge.id);
    const seasonPath = `/season/${challenge.season_id}`;
    navigate(`${seasonPath}?challenge=${encoded}#${encoded}`);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h2 className="section-title">Active Missions</h2>
        {loading ? (
          <Card>Syncing missions...</Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <Card>
              <Badge>RED TEAM // CRITICAL</Badge>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.7rem", marginBottom: ".4rem" }}>{challengeTitle(activePrimary)}</h3>
              <p style={{ color: "var(--text-secondary)" }}>{challengeDesc(activePrimary)}</p>
              {activePrimary ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", alignItems: "end" }}>
                  <div>
                    <div style={{ color: "var(--text-dim)", fontSize: ".68rem" }}>SEASON {activePrimary.season_id}</div>
                    <div style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)", fontSize: "2rem" }}>{activePrimary.points}</div>
                  </div>
                  <Button onClick={() => openChallenge(activePrimary)}>OPEN_VECTOR</Button>
                </div>
              ) : null}
            </Card>
            <Card>
              <Badge>RED TEAM // OFFENSE</Badge>
              <h4 style={{ marginBottom: ".5rem" }}>{challengeTitle(activeSecondary)}</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>{challengeDesc(activeSecondary)}</p>
              {activeSecondary ? <Button onClick={() => openChallenge(activeSecondary)}>VIEW_LOGS</Button> : null}
            </Card>
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".7rem", alignItems: "center" }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Target Vectors
          </h2>
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "ALL" },
              { id: "red", label: "RED_TEAM" }
            ]}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "1rem" }}>
          {visibleChallenges.map((challenge) => {
            const solved = solvedSet.has(challenge.id);
            return (
              <Card key={challenge.id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Badge>RED TEAM</Badge>
                  <span style={{ color: solved ? "var(--color-success)" : "var(--text-dim)", fontSize: ".7rem" }}>
                    {solved ? "SOLVED" : "OPEN"}
                  </span>
                </div>
                <h4 style={{ marginBottom: ".4rem" }}>{challengeTitle(challenge)}</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: ".82rem", minHeight: 46 }}>{challengeDesc(challenge)}</p>
                <div style={{ marginBottom: ".5rem", color: "var(--text-dim)", fontSize: ".7rem" }}>
                  {challenge.id} · {challenge.category} · {challenge.difficulty}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{challenge.points} PTS</strong>
                  <Button onClick={() => openChallenge(challenge)}>OPEN_VECTOR</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="section-title">Active Campaigns</h2>
        <Card>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/season/${s}`)}
                style={{
                  border: "1px solid var(--border-default)",
                  background: "transparent",
                  color: s.is_active ? "var(--color-primary)" : "var(--text-dim)",
                  fontFamily: "var(--font-heading)",
                  padding: "0.55rem .7rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer"
                }}
              >
                {`Season ${s}`}
              </button>
            ))}
          </div>
        </Card>
        <div style={{ marginTop: ".7rem", color: "var(--text-dim)", fontSize: ".8rem" }}>
          [ACTIVE_TARGET_API] {BASE_URL}
        </div>
      </section>
    </div>
  );
};
