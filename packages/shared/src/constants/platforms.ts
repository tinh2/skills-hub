export const PLATFORMS = ["CLAUDE_CODE", "CURSOR", "CODEX_CLI", "OTHER"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  CLAUDE_CODE: "Claude Code",
  CURSOR: "Cursor",
  CODEX_CLI: "Codex CLI",
  OTHER: "Other",
};
