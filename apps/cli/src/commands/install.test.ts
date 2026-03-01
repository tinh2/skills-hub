import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("../lib/install-path.js", () => ({
  detectInstallTarget: vi.fn(() => ({
    type: "claude-code",
    path: "/home/user/.claude/skills",
  })),
}));

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
  saveConfig: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { installCommand, installWithDependencies } from "./install.js";
import { apiRequest } from "../lib/api-client.js";
import { writeFileSync as realWriteFileSync } from "node:fs";

const mockApiRequest = vi.mocked(apiRequest);
const mockWriteFileSync = vi.mocked(realWriteFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockExistsSync = vi.mocked(existsSync);

const mockSkill = {
  id: "1",
  slug: "code-review",
  name: "Code Review",
  description: "Automated code review",
  instructions: "Review the code carefully",
  latestVersion: "2.1.0",
  category: { name: "Build", slug: "build" },
  author: { username: "tho" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(false);
  // First call: get skill detail; second call: track install (which we let resolve silently)
  mockApiRequest.mockResolvedValue(mockSkill);
});

describe("install", () => {
  it("installs a skill and writes SKILL.md", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await installCommand.parseAsync(["node", "install", "code-review"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/code-review");
    expect(mockMkdirSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/code-review",
      { recursive: true },
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/code-review/SKILL.md",
      expect.stringContaining("name: Code Review"),
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/code-review/SKILL.md",
      expect.stringContaining("version: 2.1.0"),
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/code-review/SKILL.md",
      expect.stringContaining("Review the code carefully"),
    );
    log.mockRestore();
  });

  it("installs a specific version", async () => {
    const versionResponse = { instructions: "Old instructions", version: "1.0.0" };
    mockApiRequest
      .mockResolvedValueOnce(mockSkill) // skill detail
      .mockResolvedValueOnce(versionResponse) // version detail
      .mockResolvedValueOnce(undefined); // install tracking

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await installCommand.parseAsync(["node", "install", "code-review", "--version", "1.0.0"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/code-review/versions/1.0.0");
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining("SKILL.md"),
      expect.stringContaining("version: 1.0.0"),
    );
    log.mockRestore();
  });

  it("installs from an organization with --team flag", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await installCommand.parseAsync(["node", "install", "code-review", "--team", "my-org"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/orgs/my-org/skills/code-review");
    log.mockRestore();
  });

  it("handles skill not found error", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 404 Not Found"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(installCommand.parseAsync(["node", "install", "nonexistent"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  it("tracks install via POST after writing files", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await installCommand.parseAsync(["node", "install", "code-review"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/skills/code-review/install",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("CLAUDE_CODE"),
      }),
    );
    log.mockRestore();
  });
});

// --- Composition dependency tests ---

const makeSkill = (slug: string, name: string, composition: unknown = null) => ({
  id: slug,
  slug,
  name,
  description: `${name} description`,
  instructions: `${name} instructions`,
  latestVersion: "1.0.0",
  category: { name: "Build", slug: "build" },
  author: { username: "tho" },
  composition,
});

const parentSkill = makeSkill("full-review", "Full Review", {
  description: "Complete review pipeline",
  children: [
    { skill: { slug: "lint-check", name: "Lint Check", qualityScore: 85 }, sortOrder: 0, isParallel: false },
    { skill: { slug: "security-scan", name: "Security Scan", qualityScore: 90 }, sortOrder: 1, isParallel: false },
  ],
});

const lintSkill = makeSkill("lint-check", "Lint Check");
const securitySkill = makeSkill("security-scan", "Security Scan");

function mockApiByPath(overrides: Record<string, unknown> = {}) {
  mockApiRequest.mockImplementation((path: string) => {
    if (overrides[path] instanceof Error) return Promise.reject(overrides[path]);
    if (overrides[path] !== undefined) return Promise.resolve(overrides[path]);

    if (path === "/api/v1/skills/full-review") return Promise.resolve(parentSkill);
    if (path === "/api/v1/skills/lint-check") return Promise.resolve(lintSkill);
    if (path === "/api/v1/skills/security-scan") return Promise.resolve(securitySkill);
    // Install tracking calls
    if (path.endsWith("/install")) return Promise.resolve(undefined);
    return Promise.resolve(undefined);
  });
}

describe("installWithDependencies", () => {
  it("installs composition children automatically", async () => {
    mockApiByPath();

    const result = await installWithDependencies("full-review", {});

    expect(result.parent.skill.slug).toBe("full-review");
    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toEqual({ slug: "lint-check", status: "installed" });
    expect(result.children[1]).toEqual({ slug: "security-scan", status: "installed" });

    // Parent + 2 children = 3 SKILL.md writes
    expect(mockWriteFileSync).toHaveBeenCalledTimes(3);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/lint-check/SKILL.md",
      expect.stringContaining("Lint Check instructions"),
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/security-scan/SKILL.md",
      expect.stringContaining("Security Scan instructions"),
    );
  });

  it("skips already-installed children", async () => {
    mockApiByPath();
    mockExistsSync.mockImplementation((p) => {
      return String(p) === "/home/user/.claude/skills/lint-check/SKILL.md";
    });

    const skipped: string[] = [];
    const result = await installWithDependencies("full-review", {}, {
      onChildSkip: (slug) => skipped.push(slug),
    });

    expect(skipped).toEqual(["lint-check"]);
    expect(result.children).toEqual([
      { slug: "lint-check", status: "skipped" },
      { slug: "security-scan", status: "installed" },
    ]);
    // Parent + 1 child (lint-check skipped)
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
  });

  it("continues installing remaining children when one fails", async () => {
    mockApiByPath({
      "/api/v1/skills/lint-check": new Error("API error: 404 Not Found"),
    });

    const failed: string[] = [];
    const result = await installWithDependencies("full-review", {}, {
      onChildFail: (slug) => failed.push(slug),
    });

    expect(failed).toEqual(["lint-check"]);
    expect(result.children[0]).toEqual({
      slug: "lint-check",
      status: "failed",
      error: "API error: 404 Not Found",
    });
    expect(result.children[1]).toEqual({ slug: "security-scan", status: "installed" });
    // Parent + security-scan only
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
  });

  it("returns no children for non-composition skills", async () => {
    mockApiByPath();

    const result = await installWithDependencies("lint-check", {});

    expect(result.children).toEqual([]);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
  });

  it("handles nested compositions (grandchildren)", async () => {
    const grandchild = makeSkill("format-check", "Format Check");
    const nestedLint = makeSkill("lint-check", "Lint Check", {
      description: "Lint pipeline",
      children: [
        { skill: { slug: "format-check", name: "Format Check", qualityScore: 80 }, sortOrder: 0, isParallel: false },
      ],
    });

    mockApiByPath({
      "/api/v1/skills/lint-check": nestedLint,
      "/api/v1/skills/format-check": grandchild,
    });

    const result = await installWithDependencies("full-review", {});

    expect(result.children).toHaveLength(3);
    expect(result.children.map((c) => c.slug)).toEqual(["lint-check", "format-check", "security-scan"]);
  });

  it("deduplicates shared children across branches", async () => {
    const shared = makeSkill("shared-util", "Shared Util");
    const lintWithShared = makeSkill("lint-check", "Lint Check", {
      description: "Lint",
      children: [
        { skill: { slug: "shared-util", name: "Shared Util", qualityScore: 70 }, sortOrder: 0, isParallel: false },
      ],
    });
    const securityWithShared = makeSkill("security-scan", "Security Scan", {
      description: "Security",
      children: [
        { skill: { slug: "shared-util", name: "Shared Util", qualityScore: 70 }, sortOrder: 0, isParallel: false },
      ],
    });

    mockApiByPath({
      "/api/v1/skills/lint-check": lintWithShared,
      "/api/v1/skills/security-scan": securityWithShared,
      "/api/v1/skills/shared-util": shared,
    });

    const result = await installWithDependencies("full-review", {});

    const sharedInstalls = result.children.filter((c) => c.slug === "shared-util");
    expect(sharedInstalls).toHaveLength(1);
  });

  it("installSkill alone does not install children", async () => {
    const { installSkill } = await import("./install.js");
    mockApiByPath();

    await installSkill("full-review", {});

    // installSkill writes only the parent SKILL.md — no child resolution
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/full-review/SKILL.md",
      expect.stringContaining("Full Review instructions"),
    );
  });

  it("installCommand exposes --no-deps option", () => {
    const opt = installCommand.options.find((o) => o.long === "--no-deps");
    expect(opt).toBeDefined();
  });
});
