import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
  readFileSync: vi.fn(() => ""),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/user"),
}));

import { discoverSkills, clearCache } from "./discover.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

const validSkillMd = `---
name: Code Review
description: Automated code review for quality and best practices
version: 1.0.0
---

Review the code carefully and suggest improvements.
`;

const anotherSkillMd = `---
name: Security Scan
description: Scan code for security vulnerabilities and common exploits
version: 2.0.0
---

Check for OWASP top 10 vulnerabilities.
`;

function makeDirent(name: string): ReturnType<typeof readdirSync>[0] {
  return { name, isDirectory: () => true, isFile: () => false } as ReturnType<typeof readdirSync>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  clearCache();
});

describe("discoverSkills", () => {
  it("discovers skills from claude skills directory", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === "/home/user/.claude/skills" || s.endsWith("SKILL.md");
    });
    mockReaddirSync.mockReturnValue([makeDirent("code-review")]);
    mockReadFileSync.mockReturnValue(validSkillMd);

    const skills = discoverSkills();

    expect(skills.size).toBe(1);
    expect(skills.has("code-review")).toBe(true);
    expect(skills.get("code-review")!.name).toBe("Code Review");
    expect(skills.get("code-review")!.instructions).toContain("Review the code carefully");
  });

  it("discovers skills from cursor skills directory", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === "/home/user/.cursor/skills" || s.endsWith("SKILL.md");
    });
    mockReaddirSync.mockReturnValue([makeDirent("security-scan")]);
    mockReadFileSync.mockReturnValue(anotherSkillMd);

    const skills = discoverSkills();

    expect(skills.size).toBe(1);
    expect(skills.has("security-scan")).toBe(true);
  });

  it("scans both directories and deduplicates by slug", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((dir) => {
      const s = String(dir);
      if (s.includes(".claude")) return [makeDirent("code-review")];
      if (s.includes(".cursor")) return [makeDirent("code-review"), makeDirent("security-scan")];
      return [];
    });
    mockReadFileSync.mockImplementation((p) => {
      const s = String(p);
      if (s.includes("code-review")) return validSkillMd;
      if (s.includes("security-scan")) return anotherSkillMd;
      return "";
    });

    const skills = discoverSkills();

    // code-review from claude wins (first-found), security-scan from cursor
    expect(skills.size).toBe(2);
    expect(skills.has("code-review")).toBe(true);
    expect(skills.has("security-scan")).toBe(true);
  });

  it("handles missing skills directories", () => {
    mockExistsSync.mockReturnValue(false);

    const skills = discoverSkills();

    expect(skills.size).toBe(0);
  });

  it("skips directories without SKILL.md", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      // Directory exists but SKILL.md does not
      return s === "/home/user/.claude/skills";
    });
    mockReaddirSync.mockReturnValue([makeDirent("orphan-dir")]);

    const skills = discoverSkills();

    expect(skills.size).toBe(0);
  });

  it("skips malformed SKILL.md files", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent("bad-skill")]);
    mockReadFileSync.mockReturnValue("this is not valid frontmatter");

    const skills = discoverSkills();

    expect(skills.size).toBe(0);
  });

  it("caches results for subsequent calls", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent("code-review")]);
    mockReadFileSync.mockReturnValue(validSkillMd);

    discoverSkills();
    discoverSkills();

    // readdirSync called once per directory on first call, not on second
    expect(mockReaddirSync).toHaveBeenCalledTimes(2); // once for claude, once for cursor
  });

  it("re-scans after cache is cleared", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent("code-review")]);
    mockReadFileSync.mockReturnValue(validSkillMd);

    discoverSkills();
    clearCache();
    discoverSkills();

    // 2 dirs × 2 scans = 4 calls
    expect(mockReaddirSync).toHaveBeenCalledTimes(4);
  });
});
