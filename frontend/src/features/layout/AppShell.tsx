import { PropsWithChildren, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "@features/auth/auth.store";
import { useI18nStore } from "@features/i18n/i18n.store";
import { AuthModal } from "@features/auth/AuthModal";
import { AccountPanel } from "@features/auth/AccountPanel";
import { Button } from "@shared/ui/Button";
import { SocialWidget } from "@features/social/SocialWidget";
import { TutorialOverlay } from "@features/tutorial/TutorialOverlay";

export const AppShell = ({ children }: PropsWithChildren) => {
  const profile = useAuthStore((s) => s.profile);
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const t = useI18nStore((s) => s.t);
  const [authOpen, setAuthOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="app-shell">
      <header style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface-low)" }}>
        <div
          style={{
            width: "min(1200px, 92vw)",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 0"
          }}
        >
          <Link to="/index.html" style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            &gt; the Breaker && the Fixer
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            {[
              ["/writeups.html", "Writeups"],
              ["/ctf.html", "CTF"],
              ["/learn.html", "Learn"],
              ["/aboutus.html", "About"],
              ["/leaderboard.html", "Leaderboard"],
              ["/terminal.html", "Terminal"]
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.08em",
                  fontSize: "0.72rem",
                  textTransform: "uppercase"
                })}
              >
                {label}
              </NavLink>
            ))}
            <Button onClick={() => setLang(lang === "en" ? "es" : "en")}>{lang === "en" ? "ES" : "EN"}</Button>
            {profile ? (
              <Button onClick={() => setPanelOpen(true)}>
                {profile.username} ({t("You", "Tu")}) · {profile.points} PTS
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setAuthOpen(true)}>
                Access
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer style={{ borderTop: "1px solid var(--border-default)", padding: "1rem", color: "var(--text-dim)", textAlign: "center" }}>
        © 2026 BREAKER_X_FIXER · <Link to="/privacy.html">PRIVACY_NOTICE: ZERO_PII_LOGGING_POLICY</Link>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AccountPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <SocialWidget />
      <TutorialOverlay />
    </div>
  );
};
