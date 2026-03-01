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

import { unpublishCommand } from "./unpublish.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(undefined);
});

describe("unpublish", () => {
  it("archives the skill via DELETE", async () => {
    await unpublishCommand.parseAsync(["node", "unpublish", "my-skill"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/skills/my-skill", { method: "DELETE" });
  });

  it("requires authentication", async () => {
    await unpublishCommand.parseAsync(["node", "unpublish", "my-skill"], { from: "node" });
    expect(mockEnsureAuth).toHaveBeenCalled();
  });

  it("handles not found error", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 404"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(unpublishCommand.parseAsync(["node", "unpublish", "nonexistent"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
