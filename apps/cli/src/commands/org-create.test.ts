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

import { orgCreateCommand } from "./org-create.js";
import { apiRequest } from "../lib/api-client.js";
import { ensureAuth } from "../lib/config.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockEnsureAuth = vi.mocked(ensureAuth);

const mockOrg = {
  id: "org1",
  slug: "my-team",
  name: "My Team",
  description: "A great team",
  memberCount: 1,
  skillCount: 0,
  totalInstalls: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockOrg);
});

describe("org create", () => {
  it("creates an organization with slug", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgCreateCommand.parseAsync(["node", "create", "my-team"], { from: "node" });

    expect(mockEnsureAuth).toHaveBeenCalled();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/orgs", {
      method: "POST",
      body: JSON.stringify({
        slug: "my-team",
        name: "my-team",
        description: undefined,
      }),
    });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("my-team");
    log.mockRestore();
  });

  it("passes --name and --description options", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgCreateCommand.parseAsync([
      "node", "create", "my-team",
      "--name", "My Team",
      "--description", "A great team",
    ], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/orgs", {
      method: "POST",
      body: JSON.stringify({
        slug: "my-team",
        name: "My Team",
        description: "A great team",
      }),
    });
    log.mockRestore();
  });

  it("displays success with org name and role", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await orgCreateCommand.parseAsync(["node", "create", "my-team"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("my-team");
    expect(allOutput).toContain("ADMIN");
    log.mockRestore();
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Slug already taken"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(orgCreateCommand.parseAsync(["node", "create", "taken-slug"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
