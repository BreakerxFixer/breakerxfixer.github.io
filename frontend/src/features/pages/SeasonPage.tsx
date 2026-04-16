import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Card } from "@shared/ui/Card";
import { Badge } from "@shared/ui/Badge";
import { Input } from "@shared/ui/Input";
import { Button } from "@shared/ui/Button";
import { platformService } from "@services/fastapi/platform.service";
import { PlatformChallenge } from "@shared/types/domain";
import { useAuthStore } from "@features/auth/auth.store";
import { useI18nStore } from "@features/i18n/i18n.store";

export const SeasonPage = () => {
  const { seasonId = "0" } = useParams();
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const lang = useI18nStore((s) => s.lang);
  const [challenges, setChallenges] = useState<PlatformChallenge[]>([]);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const challengeQuery = new URLSearchParams(location.search).get("challenge");
  const challengeHash = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
  const focusedChallenge = (challengeQuery || challengeHash || "").trim();

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const seasonNum = Number(seasonId);
      const [allChallenges, progress] = await Promise.all([
        platformService.getCatalog("ctf", seasonNum),
        platformService.getUserProgress(session.user.id)
      ]);
      setChallenges(allChallenges);
      setSolvedSet(new Set(progress.solves.map((s) => s.challenge_id)));
    };
    void load();
  }, [seasonId, session]);

  const visibleChallenges = useMemo(
    () => (focusedChallenge ? challenges.filter((c) => c.id === focusedChallenge) : challenges),
    [challenges, focusedChallenge]
  );

  const submitFlag = async (e: FormEvent, challengeId: string) => {
    e.preventDefault();
    if (!session) return;
    const value = flagInputs[challengeId]?.trim();
    if (!value) return;
    setSubmitting((s) => ({ ...s, [challengeId]: true }));
    try {
      const result = await platformService.submitChallenge(session.user.id, {
        challenge_id: challengeId,
        value
      });
      setStatus((s) => ({ ...s, [challengeId]: result.message }));
      if (result.success && session) {
        const progress = await platformService.getUserProgress(session.user.id);
        setSolvedSet(new Set(progress.solves.map((r) => r.challenge_id)));
        await refreshProfile();
      }
    } catch (err) {
      setStatus((s) => ({ ...s, [challengeId]: (err as Error).message }));
    } finally {
      setSubmitting((s) => ({ ...s, [challengeId]: false }));
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", marginBottom: 0 }}>
        Season {seasonId} {focusedChallenge ? `· ${focusedChallenge}` : ""}
      </h2>
      {visibleChallenges.map((challenge) => {
        const solved = solvedSet.has(challenge.id);
        return (
          <Card key={challenge.id} style={focusedChallenge === challenge.id ? { border: "1px solid var(--color-primary)", boxShadow: "var(--shadow-glow)" } : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "start" }}>
              <div>
                <h3 id={challenge.id} style={{ marginTop: 0 }}>
                  {challenge.id} · {lang === "es" ? challenge.title_es : challenge.title_en}
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  {lang === "es" ? challenge.description_es : challenge.description_en}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <Badge>{challenge.category}</Badge>
                <div style={{ marginTop: ".35rem" }}>{challenge.points} PTS</div>
                <div style={{ color: solved ? "var(--color-success)" : "var(--text-dim)", fontSize: ".75rem" }}>
                  {solved ? "SOLVED" : "OPEN"}
                </div>
              </div>
            </div>
            <form onSubmit={(e) => void submitFlag(e, challenge.id)} style={{ display: "flex", gap: ".5rem", marginTop: ".7rem" }}>
              <Input
                placeholder="bxf{...}"
                value={flagInputs[challenge.id] ?? ""}
                onChange={(e) => setFlagInputs((s) => ({ ...s, [challenge.id]: e.target.value }))}
              />
              <Button variant="primary" disabled={submitting[challenge.id]}>
                Validate
              </Button>
            </form>
            {status[challenge.id] ? (
              <div style={{ marginTop: ".4rem", color: solved ? "var(--color-success)" : "var(--color-error)" }}>
                {status[challenge.id]}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
};
