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

import { orgListCommand } from "./org-list.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);

const mockOrgs = [
  {
    role: "ADMIN",
    org: { slug: "my-team", name: "My Team" },
  },
  {
    role: "PUBLISHER",
    org: { slug: "open-source", name: "Open Source Crew" },
  },
  {
    role: "VIEWER",
    org: { slug: "readers", name: "Readers Club" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockOrgs);
});

describe("org list", () => {
  it("requires authentication", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgListCommand.parseAsync(["node", "list"], { from: "node" });
    expect(mockEnsureAuth).toHaveBeenCalled();
    log.mockRestore();
  });

  it("lists organizations with roles", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgListCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("My Team");
    expect(allOutput).toContain("ADMIN");
    expect(allOutput).toContain("Open Source Crew");
    expect(allOutput).toContain("PUBLISHER");
    expect(allOutput).toContain("Readers Club");
    expect(allOutput).toContain("VIEWER");
    log.mockRestore();
  });

  it("shows message when user has no organizations", async () => {
    mockApiRequest.mockResolvedValue([]);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgListCommand.parseAsync(["node", "list"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("not a member of any organizations");
    log.mockRestore();
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Unauthorized"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(orgListCommand.parseAsync(["node", "list"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
