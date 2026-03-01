import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
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

import { updateCommand } from "./update.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

const mockRemoteSkill = {
  id: "1",
  slug: "code-review",
  name: "Code Review",
  description: "Automated code review",
  instructions: "Updated instructions",
  latestVersion: "3.0.0",
  category: { name: "Build", slug: "build" },
  author: { username: "tho" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("update", () => {
  it("updates all installed skills when newer version available", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: "code-review", isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue("---\nname: Code Review\nversion: 2.0.0\n---\nOld");
    mockApiRequest.mockResolvedValue(mockRemoteSkill);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await updateCommand.parseAsync(["node", "update"], { from: "node" });

    // Should have fetched remote info
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/code-review");
    log.mockRestore();
  });

  it("updates a specific skill by slug", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("---\nname: Code Review\nversion: 1.0.0\n---\nOld");
    mockApiRequest.mockResolvedValue(mockRemoteSkill);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await updateCommand.parseAsync(["node", "update", "code-review"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/code-review");
    // Should not call readdirSync when specific slug given
    expect(mockReaddirSync).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("reports when skill is already up to date", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: "code-review", isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue("---\nname: Code Review\nversion: 3.0.0\n---\nLatest");
    mockApiRequest.mockResolvedValue(mockRemoteSkill);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await updateCommand.parseAsync(["node", "update"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("up to date");
    log.mockRestore();
  });

  it("shows message when no skills are installed", async () => {
    mockExistsSync.mockReturnValue(false);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await updateCommand.parseAsync(["node", "update"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("No skills installed");
    log.mockRestore();
  });
});
