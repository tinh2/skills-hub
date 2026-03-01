import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("../lib/install-path.js", () => ({
  detectInstallTarget: vi.fn(() => ({
    type: "claude-code",
    path: "/home/user/.claude/skills",
  })),
}));

import { listCommand } from "./list.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("list", () => {
  it("lists installed skills with name and version", async () => {
    mockExistsSync.mockImplementation((p) => {
      const path = String(p);
      if (path === "/home/user/.claude/skills") return true;
      if (path.endsWith("SKILL.md")) return true;
      return false;
    });
    mockReaddirSync.mockReturnValue([
      { name: "code-review", isDirectory: () => true },
      { name: "test-gen", isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockImplementation((p) => {
      const path = String(p);
      if (path.includes("code-review")) {
        return "---\nname: Code Review\nversion: 2.1.0\n---\nReview code";
      }
      return "---\nname: Test Generator\nversion: 1.0.0\n---\nGenerate tests";
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await listCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Code Review");
    expect(allOutput).toContain("v2.1.0");
    expect(allOutput).toContain("Test Generator");
    expect(allOutput).toContain("v1.0.0");
    log.mockRestore();
  });

  it("shows message when no skills directory exists", async () => {
    mockExistsSync.mockReturnValue(false);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await listCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("No skills installed");
    log.mockRestore();
  });

  it("shows message when directory exists but is empty", async () => {
    mockExistsSync.mockImplementation((p) => {
      if (String(p) === "/home/user/.claude/skills") return true;
      return false;
    });
    mockReaddirSync.mockReturnValue([] as any);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await listCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("No skills installed");
    log.mockRestore();
  });

  it("shows unknown version when SKILL.md lacks version field", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: "my-skill", isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue("---\nname: My Skill\n---\nInstructions");

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await listCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("My Skill");
    expect(allOutput).toContain("unknown");
    log.mockRestore();
  });
});
