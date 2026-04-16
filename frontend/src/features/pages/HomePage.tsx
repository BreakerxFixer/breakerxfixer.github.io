import { Link } from "react-router-dom";
import { Card } from "@shared/ui/Card";
import { Button } from "@shared/ui/Button";
import { useI18nStore } from "@features/i18n/i18n.store";

export const HomePage = () => {
  const t = useI18nStore((s) => s.t);
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card style={{ padding: "1.6rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>REAKER_X_FIXER</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          {t(
            "Cybersecurity CTF platform with live ranking, social system and practical missions.",
            "Plataforma CTF de ciberseguridad con ranking en vivo, sistema social y misiones practicas."
          )}
        </p>
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <Link to="/ctf.html">
            <Button variant="primary">{t("Enter CTF", "Entrar a CTF")}</Button>
          </Link>
          <Link to="/leaderboard.html">
            <Button>{t("View Leaderboard", "Ver leaderboard")}</Button>
          </Link>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1rem" }}>
        {[
          ["22 Challenges", "Web, Crypto, Pwn, Forensics, OSINT, Rev, Hardware"],
          ["No PII", "Alias + password flow with Supabase auth"],
          ["Realtime Social", "Friend requests and private chat"]
        ].map(([title, desc]) => (
          <Card key={title}>
            <h3 style={{ fontFamily: "var(--font-heading)" }}>{title}</h3>
            <p style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
