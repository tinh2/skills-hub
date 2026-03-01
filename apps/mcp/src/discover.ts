import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseSkillMd, type ParsedSkill } from "@skills-hub/skill-parser";

const CACHE_TTL_MS = 30_000;

let cache: Map<string, ParsedSkill> | null = null;
let cacheTime = 0;

/** Directories where skills may be installed */
function getSkillPaths(): string[] {
  const home = homedir();
  return [
    join(home, ".claude", "skills"),
    join(home, ".cursor", "skills"),
  ];
}

/** Scan a single skills directory and collect parsed skills */
function scanDir(dir: string, out: Map<string, ParsedSkill>): void {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    if (out.has(slug)) continue; // first-found wins (claude > cursor)

    const skillFile = join(dir, slug, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    try {
      const content = readFileSync(skillFile, "utf-8");
      const result = parseSkillMd(content);
      if (result.success && result.skill) {
        out.set(slug, result.skill);
      }
    } catch {
      // Skip malformed files
    }
  }
}

/** Discover all installed skills, cached for 30s */
export function discoverSkills(): Map<string, ParsedSkill> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL_MS) {
    return cache;
  }

  const skills = new Map<string, ParsedSkill>();
  for (const dir of getSkillPaths()) {
    scanDir(dir, skills);
  }

  cache = skills;
  cacheTime = now;
  return skills;
}

/** Clear the discovery cache (for testing) */
export function clearCache(): void {
  cache = null;
  cacheTime = 0;
}
