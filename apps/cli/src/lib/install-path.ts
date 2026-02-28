import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

type Target = "claude-code" | "cursor" | "unknown";

interface InstallTarget {
  type: Target;
  path: string;
}

export function detectInstallTarget(): InstallTarget {
  const home = homedir();

  // Claude Code
  const claudeSkillsDir = join(home, ".claude", "skills");
  if (existsSync(join(home, ".claude"))) {
    return { type: "claude-code", path: claudeSkillsDir };
  }

  // Cursor
  const cursorDir = join(home, ".cursor");
  if (existsSync(cursorDir)) {
    return { type: "cursor", path: join(cursorDir, "skills") };
  }

  // Default to Claude Code
  return { type: "claude-code", path: claudeSkillsDir };
}
