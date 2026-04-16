import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@shared/ui/Button";
import { useTutorialStore } from "./tutorial.store";

const pageSteps: Record<string, string[]> = {
  "/": ["Choose language and auth session.", "Use CTF to open mission operations.", "Track progress on leaderboard."],
  "/ctf": ["Review active missions.", "Open vectors to jump into season targets.", "Submit flags from season views."],
  "/learn": ["Open training tracks.", "Launch embedded terminal.", "Complete practical modules."]
};

export const TutorialOverlay = () => {
  const location = useLocation();
  const replayToken = useTutorialStore((s) => s.replayToken);
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => pageSteps[location.pathname], [location.pathname]);

  useEffect(() => {
    if (!steps?.length) return;
    const key = `tutorial_done_${location.pathname}`;
    const done = localStorage.getItem(key);
    if (!done || replayToken > 0) {
      setOpen(true);
      if (replayToken === 0) localStorage.setItem(key, "1");
    }
  }, [location.pathname, replayToken, steps]);

  if (!open || !steps?.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "var(--bg-overlay)",
        display: "grid",
        placeItems: "center"
      }}
      onClick={() => setOpen(false)}
    >
      <div className="panel" style={{ width: "min(560px, 92vw)", padding: "1rem" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-heading)" }}>System Briefing</h3>
        <ol style={{ color: "var(--text-secondary)" }}>
          {steps.map((step) => (
            <li key={step} style={{ marginBottom: "0.45rem" }}>
              {step}
            </li>
          ))}
        </ol>
        <Button variant="primary" onClick={() => setOpen(false)}>
          Continue
        </Button>
      </div>
    </div>
  );
};
