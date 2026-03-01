import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PublicUser } from "@skills-hub/shared";
import { setAccessToken } from "./api";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: PublicUser, accessToken: string) => void;
  logout: () => void;
  _hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, accessToken) => {
        setAccessToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },
      logout: () => {
        setAccessToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      _hydrate: () => {
        const { accessToken } = get();
        if (accessToken) {
          setAccessToken(accessToken);
        }
      },
    }),
    {
      name: "skills-hub-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Rehydrate the access token on store init (client-side only)
if (typeof window !== "undefined") {
  useAuthStore.getState()._hydrate();
}
