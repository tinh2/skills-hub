import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
  saveConfig: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { searchCommand } from "./search.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);

const mockResults = {
  data: [
    {
      id: "1",
      slug: "code-review",
      name: "Code Review",
      description: "Automated code review skill for Claude Code",
      qualityScore: 92,
      latestVersion: "2.1.0",
      installCount: 150,
      author: { username: "tho" },
    },
    {
      id: "2",
      slug: "test-gen",
      name: "Test Generator",
      description: "Generate unit tests automatically",
      qualityScore: null,
      latestVersion: "1.0.0",
      installCount: 42,
      author: { username: "jane" },
    },
  ],
  cursor: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockResolvedValue(mockResults);
});

describe("search", () => {
  it("searches with query and displays results", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await searchCommand.parseAsync(["node", "search", "code review"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/search?"),
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining("q=code+review"),
    );
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Code Review");
    expect(allOutput).toContain("Test Generator");
    expect(allOutput).toContain("150 installs");
    log.mockRestore();
  });

  it("passes --category filter", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await searchCommand.parseAsync(["node", "search", "test", "--category", "build"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining("category=build"),
    );
    log.mockRestore();
  });

  it("passes --sort option", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await searchCommand.parseAsync(["node", "search", "test", "--sort", "newest"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining("sort=newest"),
    );
    log.mockRestore();
  });

  it("handles empty results", async () => {
    mockApiRequest.mockResolvedValue({ data: [], cursor: null });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await searchCommand.parseAsync(["node", "search", "nonexistent"], { from: "node" });

    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("No skills found");
    log.mockRestore();
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 500"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(searchCommand.parseAsync(["node", "search", "fail"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
