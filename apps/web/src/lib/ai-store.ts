import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const OPENROUTER_MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-haiku-4-20250514", label: "Claude Haiku 4 (fast)" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
] as const;

interface AiState {
  openRouterKey: string | null;
  preferredModel: string;
  setKey: (key: string | null) => void;
  setModel: (model: string) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      openRouterKey: null,
      preferredModel: OPENROUTER_MODELS[0].id,
      setKey: (key) => set({ openRouterKey: key }),
      setModel: (model) => set({ preferredModel: model }),
    }),
    {
      name: "skills-hub-ai",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      partialize: (state) => ({
        openRouterKey: state.openRouterKey,
        preferredModel: state.preferredModel,
      }),
    },
  ),
);
