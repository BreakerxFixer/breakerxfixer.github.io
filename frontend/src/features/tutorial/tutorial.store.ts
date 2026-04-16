import { create } from "zustand";

type TutorialState = {
  replayToken: number;
  replay: () => void;
};

export const useTutorialStore = create<TutorialState>((set) => ({
  replayToken: 0,
  replay: () => set((s) => ({ replayToken: s.replayToken + 1 }))
}));
