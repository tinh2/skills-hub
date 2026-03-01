import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfig = vi.fn();

vi.mock("../lib/config.js", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  getAuthHeader: vi.fn(() => ({ Authorization: "Bearer tok" })),
  saveConfig: vi.fn(),
  ensureAuth: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { whoamiCommand } from "./whoami.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);

const mockUser = {
  id: "u1",
  username: "tho",
  displayName: "Tho",
  avatarUrl: null,
  bio: null,
  githubUrl: "https://github.com/tho",
  email: "tho@example.com",
  createdAt: "2026-01-01",
  skillCount: 5,
  totalInstalls: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockUser);
  mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai", accessToken: "tok" });
});

describe("whoami", () => {
  it("requires authentication", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await whoamiCommand.parseAsync(["node", "whoami"], { from: "node" });
    expect(mockEnsureAuth).toHaveBeenCalled();
    log.mockRestore();
  });

  it("displays user info for OAuth login", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await whoamiCommand.parseAsync(["node", "whoami"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("tho");
    expect(allOutput).toContain("OAuth");
    log.mockRestore();
  });

  it("shows API key auth method when using apiKey", async () => {
    mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai", apiKey: "key123" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await whoamiCommand.parseAsync(["node", "whoami"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("API key");
    log.mockRestore();
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Unauthorized"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(whoamiCommand.parseAsync(["node", "whoami"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
