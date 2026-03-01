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

import { versionCreateCommand } from "./version-create.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";
import { readAndParseSkillMd } from "../lib/skill-file.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);
const mockReadSkill = vi.mocked(readAndParseSkillMd);

const validSkill = {
  name: "Test",
  description: "A test",
  version: "1.1.0",
  category: "build",
  platforms: ["CLAUDE_CODE"],
  instructions: "Updated instructions",
  raw: "---\nname: Test\n---\nUpdated instructions",
};

const versionResponse = {
  id: "v2",
  version: "1.1.0",
  changelog: null,
  qualityScore: 90,
  createdAt: "2026-01-02",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadSkill.mockReturnValue(validSkill);
  mockApiRequest.mockResolvedValue(versionResponse);
});

describe("version", () => {
  it("requires authentication", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill"], { from: "node" });
    expect(mockEnsureAuth).toHaveBeenCalled();
  });

  it("reads SKILL.md from path argument", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill", "./custom/SKILL.md"], { from: "node" });
    expect(mockReadSkill).toHaveBeenCalledWith("./custom/SKILL.md");
  });

  it("defaults to ./SKILL.md", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill"], { from: "node" });
    expect(mockReadSkill).toHaveBeenCalledWith("./SKILL.md");
  });

  it("posts to the correct API endpoint", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/skills/my-skill/versions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends version and instructions in body", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.version).toBe("1.1.0");
    expect(body.instructions).toBe("Updated instructions");
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Version already exists"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(versionCreateCommand.parseAsync(["node", "version", "my-skill"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  // Sticky flag test last
  it("passes --changelog flag", async () => {
    await versionCreateCommand.parseAsync(["node", "version", "my-skill", "--changelog", "Fixed bugs"], { from: "node" });
    const body = JSON.parse((mockApiRequest.mock.calls[0][1] as any).body);
    expect(body.changelog).toBe("Fixed bugs");
  });
});
