import { create } from "zustand";
import type { PublicUser } from "@skills-hub/shared";
import { setAccessToken } from "./api";

interface AuthState {
  user: PublicUser | null;
  isAuthenticated: boolean;
  login: (user: PublicUser, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
