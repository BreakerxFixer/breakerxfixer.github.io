import { Card } from "@shared/ui/Card";
import { Link } from "react-router-dom";
import { Button } from "@shared/ui/Button";
import { useEffect, useState } from "react";
import { platformService } from "@services/fastapi/platform.service";
import { PlatformChallenge } from "@shared/types/domain";
import { useAuthStore } from "@features/auth/auth.store";
import { useI18nStore } from "@features/i18n/i18n.store";

export const LearnPage = () => {
  const session = useAuthStore((s) => s.session);
  const lang = useI18nStore((s) => s.lang);
  const [modules, setModules] = useState<PlatformChallenge[]>([]);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  useEffect(() => {
    void platformService.getCatalog("learn").then(setModules);
  }, []);

  const startLab = async (challengeId: string) => {
    if (!session) return;
    setLoadingSessionId(challengeId);
    try {
      const data = await platformService.startLearnSession(session.user.id, challengeId);
      const target = `/terminal.html?mode=real&challenge=${encodeURIComponent(challengeId)}&session=${encodeURIComponent(data.session_id)}`;
      window.location.href = target;
    } finally {
      setLoadingSessionId(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-heading)" }}>Learning Tracks</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Interactive modules connected to real terminal sessions with server-side verification markers.
        </p>
        <Link to="/terminal.html">
          <Button variant="primary">Open Terminal Hub</Button>
        </Link>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1rem" }}>
        {modules.map((m) => (
          <Card key={m.id}>
            <h3 style={{ marginTop: 0 }}>{lang === "es" ? m.title_es : m.title_en}</h3>
            <p style={{ color: "var(--text-secondary)" }}>{m.difficulty.toUpperCase()}</p>
            <p style={{ color: "var(--text-secondary)", minHeight: 50 }}>
              {lang === "es" ? m.description_es : m.description_en}
            </p>
            <Button
              disabled={!session || loadingSessionId === m.id}
              onClick={() => void startLab(m.id)}
            >
              {loadingSessionId === m.id ? "STARTING..." : "START_LAB"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
