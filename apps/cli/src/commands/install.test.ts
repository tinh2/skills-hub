import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";

vi.mock("node:fs", () => ({
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

import { installCommand } from "./install.js";
import { apiRequest } from "../lib/api-client.js";
import { writeFileSync as realWriteFileSync } from "node:fs";

const mockApiRequest = vi.mocked(apiRequest);
const mockWriteFileSync = vi.mocked(realWriteFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

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
