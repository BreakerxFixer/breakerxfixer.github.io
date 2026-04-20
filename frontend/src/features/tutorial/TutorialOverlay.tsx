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
    const globalDone = localStorage.getItem("bxf_tutorial_global_done") === "1";
    const done = localStorage.getItem(key);
    const shouldOpen = replayToken > 0 || (!done && !globalDone);
    if (shouldOpen) setOpen(true);
  }, [location.pathname, replayToken, steps]);

  if (!open || !steps?.length) return null;

  const persistDismissed = () => {
    const key = `tutorial_done_${location.pathname}`;
    try {
      localStorage.setItem(key, "1");
      localStorage.setItem("bxf_tutorial_global_done", "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

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
      onClick={persistDismissed}
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
        <Button variant="primary" onClick={persistDismissed}>
          Continue
        </Button>
      </div>
    </div>
  );
};
