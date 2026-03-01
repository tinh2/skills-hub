import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
  saveConfig: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { diffCommand } from "./diff.js";
import { apiRequest } from "../lib/api-client.js";

const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("diff", () => {
  it("displays color-coded diff output", async () => {
    mockApiRequest.mockResolvedValue({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      diff: "--- a/instructions\n+++ b/instructions\n@@ -1,3 +1,4 @@\n line1\n-old line\n+new line\n line3",
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await diffCommand.parseAsync(["node", "diff", "my-skill", "1.0.0", "1.1.0"], { from: "node" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/skills/my-skill/versions/1.0.0/diff/1.1.0",
    );
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("handles skill not found", async () => {
    mockApiRequest.mockRejectedValue(new Error("API error: 404"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(diffCommand.parseAsync(["node", "diff", "nope", "1.0.0", "2.0.0"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });

  it("handles API errors", async () => {
    mockApiRequest.mockRejectedValue(new Error("Server error"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(diffCommand.parseAsync(["node", "diff", "my-skill", "1.0.0", "2.0.0"], { from: "node" })).rejects.toThrow("exit");
    exit.mockRestore();
  });
});
