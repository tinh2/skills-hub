import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai", accessToken: "tok" })),
  getAuthHeader: vi.fn(() => ({ Authorization: "Bearer tok" })),
  saveConfig: vi.fn(),
  ensureAuth: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("../lib/skill-file.js", () => ({
  readAndParseSkillMd: vi.fn(),
}));

import { publishCommand } from "./publish.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";
import { readAndParseSkillMd } from "../lib/skill-file.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);
const mockReadSkill = vi.mocked(readAndParseSkillMd);

const validSkill = {
  name: "Test Skill",
  description: "A test",
  version: "1.0.0",
  category: "build",
  platforms: ["CLAUDE_CODE"],
  instructions: "Do stuff",
  raw: "---\nname: Test Skill\n---\nDo stuff",
};

const apiResponse = {
  id: "1",
  slug: "test-skill",
  name: "Test Skill",
  description: "A test",
  latestVersion: "1.0.0",
  qualityScore: 85,
  status: "PUBLISHED",
  visibility: "PUBLIC",
  category: { name: "Build", slug: "build" },
  author: { username: "tho", avatarUrl: null },
  platforms: ["CLAUDE_CODE"],
  installCount: 0,
  avgRating: null,
  reviewCount: 0,
  tags: [],
  isComposition: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  instructions: "Do stuff",
  githubRepoUrl: null,
  versions: [],
  composition: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadSkill.mockReturnValue(validSkill);
  mockApiRequest.mockResolvedValue(apiResponse);
});

describe("publish", () => {
  it("requires authentication", async () => {
    await publishCommand.parseAsync(["node", "publish"], { from: "node" });
    expect(mockEnsureAuth).toHaveBeenCalled();
  });

  it("reads and parses SKILL.md from path", async () => {
    await publishCommand.parseAsync(["node", "publish", "./custom/SKILL.md"], { from: "node" });
    expect(mockReadSkill).toHaveBeenCalledWith("./custom/SKILL.md");
  });

  it("uses default path ./SKILL.md when no path given", async () => {
    await publishCommand.parseAsync(["node", "publish"], { from: "node" });
    expect(mockReadSkill).toHaveBeenCalledWith("./SKILL.md");
  });

  it("fails when category is missing", async () => {
    mockReadSkill.mockReturnValue({ ...validSkill, category: undefined });
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(publishCommand.parseAsync(["node", "publish"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  it("creates skill via POST and publishes", async () => {
    await publishCommand.parseAsync(["node", "publish"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills", expect.objectContaining({ method: "POST" }));
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/test-skill/publish", expect.objectContaining({ method: "POST" }));
  });

  it("passes visibility from --visibility flag", async () => {
    await publishCommand.parseAsync(["node", "publish", "--visibility", "private"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.visibility).toBe("PRIVATE");
  });

  it("defaults platforms to CLAUDE_CODE when empty", async () => {
    mockReadSkill.mockReturnValue({ ...validSkill, platforms: [] });
    await publishCommand.parseAsync(["node", "publish"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.platforms).toEqual(["CLAUDE_CODE"]);
  });

  it("passes github-repo when provided", async () => {
    await publishCommand.parseAsync(["node", "publish", "--github-repo", "https://github.com/foo/bar"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.githubRepoUrl).toBe("https://github.com/foo/bar");
  });

  it("handles API errors gracefully", async () => {
    mockApiRequest.mockRejectedValue(new Error("Slug already taken"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(publishCommand.parseAsync(["node", "publish"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  // Tests with sticky flags last to avoid statefulness issues
  it("skips publish step with --draft", async () => {
    await publishCommand.parseAsync(["node", "publish", "--draft"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills", expect.anything());
  });

  it("passes tags from --tags flag", async () => {
    await publishCommand.parseAsync(["node", "publish", "--tags", "ai,testing"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.tags).toEqual(["ai", "testing"]);
  });
});
