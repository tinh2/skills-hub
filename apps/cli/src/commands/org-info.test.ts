import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
  saveConfig: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { orgInfoCommand } from "./org-info.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);

const mockOrg = {
  id: "org1",
  slug: "my-team",
  name: "My Team",
  description: "A great engineering team",
  memberCount: 5,
  skillCount: 12,
  totalInstalls: 340,
  githubOrg: "my-team-gh",
  currentUserRole: "ADMIN",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockOrg);
});

describe("org info", () => {
  it("displays organization details", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgInfoCommand.parseAsync(["node", "info", "my-team"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/orgs/my-team");
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("My Team");
    expect(allOutput).toContain("A great engineering team");
    expect(allOutput).toContain("5");
    expect(allOutput).toContain("12");
    expect(allOutput).toContain("340");
    expect(allOutput).toContain("my-team-gh");
    expect(allOutput).toContain("ADMIN");
    log.mockRestore();
  });

  it("handles org not found error", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 404 Not Found"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(orgInfoCommand.parseAsync(["node", "info", "nonexistent"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
    errSpy.mockRestore();
  });

  // Sticky flag tests LAST — Commander persists boolean flags on the singleton
  it("fetches and displays members with --members flag", async () => {
    const membersResponse = {
      data: [
        { user: { username: "alice" }, role: "ADMIN" },
        { user: { username: "bob" }, role: "PUBLISHER" },
      ],
      cursor: null,
    };
    mockApiRequest
      .mockResolvedValueOnce(mockOrg)
      .mockResolvedValueOnce(membersResponse);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgInfoCommand.parseAsync(["node", "info", "my-team", "--members"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/orgs/my-team/members?limit=50");
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("alice");
    expect(allOutput).toContain("bob");
    log.mockRestore();
  });

  it("outputs JSON with --json flag", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgInfoCommand.parseAsync(["node", "info", "my-team", "--json"], { from: "node" });

    const output = log.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.slug).toBe("my-team");
    expect(parsed.name).toBe("My Team");
    expect(parsed.memberCount).toBe(5);
    log.mockRestore();
  });
});
