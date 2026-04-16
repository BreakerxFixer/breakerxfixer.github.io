import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { authService } from "@services/supabase/auth.service";
import { profileService } from "@services/supabase/profile.service";
import { Profile } from "@shared/types/domain";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  error: null,

  bootstrap: async () => {
    try {
      set({ loading: true, error: null });
      const session = await authService.getSession();
      if (!session) {
        set({ session: null, profile: null, loading: false });
        return;
      }
      const profile = await profileService.getProfile(session.user.id);
      set({ session, profile, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const session = await authService.login(username, password);
      if (!session) {
        set({ loading: false, error: "No session returned" });
        return;
      }
      const profile = await profileService.getProfile(session.user.id);
      set({ session, profile, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  signup: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const session = await authService.signup(username, password);
      if (!session) {
        await get().bootstrap();
        return;
      }
      const profile = await profileService.getProfile(session.user.id);
      set({ session, profile, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await profileService.getProfile(session.user.id);
    set({ profile });
  }
}));
