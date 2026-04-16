import { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@features/layout/AppShell";
import { HomePage } from "@features/pages/HomePage";
import { CtfDashboardPage } from "@features/pages/CtfDashboardPage";
import { SeasonPage } from "@features/pages/SeasonPage";
import { LeaderboardPage } from "@features/pages/LeaderboardPage";
import { LearnPage } from "@features/pages/LearnPage";
import { WriteupsPage } from "@features/pages/WriteupsPage";
import { AboutPage } from "@features/pages/AboutPage";
import { PrivacyPage } from "@features/pages/PrivacyPage";
import { TerminalPage } from "@features/pages/TerminalPage";
import { useAuthStore } from "@features/auth/auth.store";

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return <div className="page-loading">Syncing session...</div>;
  if (!session) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return children;
};

export const useAppRouter = () => {
  const Router = () => (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/ctf" element={<RequireAuth><CtfDashboardPage /></RequireAuth>} />
        <Route path="/ctf.html" element={<Navigate to="/ctf" replace />} />
        <Route path="/season/:seasonId" element={<RequireAuth><SeasonPage /></RequireAuth>} />
        <Route path="/season0.html" element={<Navigate to="/season/100" replace />} />
        <Route path="/season1.html" element={<Navigate to="/season/100" replace />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/leaderboard.html" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/learn" element={<RequireAuth><LearnPage /></RequireAuth>} />
        <Route path="/learn.html" element={<Navigate to="/learn" replace />} />
        <Route path="/writeups" element={<WriteupsPage />} />
        <Route path="/writeups.html" element={<Navigate to="/writeups" replace />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/aboutus.html" element={<Navigate to="/about" replace />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/privacy.html" element={<Navigate to="/privacy" replace />} />
        <Route path="/terminal" element={<RequireAuth><TerminalPage /></RequireAuth>} />
        <Route path="/terminal.html" element={<Navigate to="/terminal" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );

  return Router;
};
