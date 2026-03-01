import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
  saveConfig: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { infoCommand } from "./info.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);

const mockSkill = {
  id: "1",
  slug: "test-skill",
  name: "Test Skill",
  description: "A test skill for testing",
  category: { name: "Build", slug: "build" },
  author: { username: "tho", avatarUrl: null },
  status: "PUBLISHED",
  visibility: "PUBLIC",
  platforms: ["CLAUDE_CODE"],
  qualityScore: 85,
  installCount: 42,
  avgRating: 4.5,
  reviewCount: 3,
  latestVersion: "1.2.0",
  tags: ["testing", "ci"],
  isComposition: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-15",
  instructions: "Test instructions",
  githubRepoUrl: "https://github.com/tho/test-skill",
  versions: [
    { id: "v1", version: "1.0.0", changelog: "Initial release", qualityScore: 80, createdAt: "2026-01-01" },
    { id: "v2", version: "1.2.0", changelog: "Bug fixes", qualityScore: 85, createdAt: "2026-01-15" },
  ],
  composition: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockSkill);
});

describe("info", () => {
  it("fetches and displays skill details", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await infoCommand.parseAsync(["node", "info", "test-skill"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/test-skill");
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Test Skill");
    expect(allOutput).toContain("tho");
    log.mockRestore();
  });

  it("handles skill not found", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 404"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(infoCommand.parseAsync(["node", "info", "nonexistent"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  it("displays version list", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await infoCommand.parseAsync(["node", "info", "test-skill"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("v1.0.0");
    expect(allOutput).toContain("v1.2.0");
    expect(allOutput).toContain("Initial release");
    log.mockRestore();
  });

  it("displays visibility", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await infoCommand.parseAsync(["node", "info", "test-skill"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("PUBLIC");
    log.mockRestore();
  });

  // --json test LAST because Commander persists the flag on the singleton
  it("outputs JSON with --json flag", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await infoCommand.parseAsync(["node", "info", "test-skill", "--json"], { from: "node" });
    const output = log.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.slug).toBe("test-skill");
    expect(parsed.name).toBe("Test Skill");
    log.mockRestore();
  });
});
