import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();

vi.mock("../lib/config.js", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  getAuthHeader: vi.fn(() => ({ Authorization: "Bearer tok" })),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { logoutCommand } from "./logout.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(undefined);
});

describe("logout", () => {
  it("shows message when not logged in", async () => {
    mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await logoutCommand.parseAsync(["node", "logout"], { from: "node" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Not logged in"));
    expect(mockSaveConfig).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("clears accessToken on logout", async () => {
    mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai", accessToken: "tok" });
    await logoutCommand.parseAsync(["node", "logout"], { from: "node" });
    expect(mockSaveConfig).toHaveBeenCalledWith({ accessToken: undefined, apiKey: undefined });
  });

  it("attempts server-side session revocation for OAuth", async () => {
    mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai", accessToken: "tok" });
    await logoutCommand.parseAsync(["node", "logout"], { from: "node" });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/auth/session", { method: "DELETE" });
  });

  it("clears apiKey on logout", async () => {
    mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai", apiKey: "key123" });
    await logoutCommand.parseAsync(["node", "logout"], { from: "node" });
    expect(mockSaveConfig).toHaveBeenCalledWith({ accessToken: undefined, apiKey: undefined });
  });
});
