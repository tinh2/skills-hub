import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readdirSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));

vi.mock("../lib/install-path.js", () => ({
  detectInstallTarget: vi.fn(() => ({
    type: "claude-code",
    path: "/home/user/.claude/skills",
  })),
}));

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(() => ({ apiUrl: "https://api.skills-hub.ai" })),
  getAuthHeader: vi.fn(() => ({})),
}));

vi.mock("../lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { initCommand } from "./init.js";
import { apiRequest } from "../lib/api-client.js";
import { getConfig } from "../lib/config.js";
import { detectInstallTarget } from "../lib/install-path.js";

const mockApiRequest = vi.mocked(apiRequest);
const mockGetConfig = vi.mocked(getConfig);
const mockDetectInstallTarget = vi.mocked(detectInstallTarget);
const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);

beforeEach(() => {
  vi.clearAllMocks();
  mockApiRequest.mockRejectedValue(new Error("offline"));
  mockExistsSync.mockReturnValue(false);
  mockDetectInstallTarget.mockReturnValue({ type: "claude-code", path: "/home/user/.claude/skills" });
  mockGetConfig.mockReturnValue({ apiUrl: "https://api.skills-hub.ai" });
});

describe("init", () => {
  it("shows welcome message", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Welcome to skills-hub.ai");
    log.mockRestore();
  });

  it("detects Claude Code platform", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Claude Code");
    expect(output).toContain("/home/user/.claude/skills");
    log.mockRestore();
  });

  it("detects Cursor platform", async () => {
    mockDetectInstallTarget.mockReturnValue({
      type: "cursor",
      path: "/home/user/.cursor/skills",
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Cursor");
    expect(output).toContain(".cursor/mcp.json");
    log.mockRestore();
  });

  it("shows login prompt when unauthenticated", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("skills-hub login");
    log.mockRestore();
  });

  it("shows authenticated status when logged in", async () => {
    mockGetConfig.mockReturnValue({
      apiUrl: "https://api.skills-hub.ai",
      accessToken: "test-token",
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Yes");
    expect(output).not.toContain("skills-hub login");
    log.mockRestore();
  });

  it("shows skill count when skills exist", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: "code-review", isDirectory: () => true },
      { name: "security-scan", isDirectory: () => true },
    ] as unknown as ReturnType<typeof readdirSync>);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("2");
    expect(output).toContain("skills-hub list");
    log.mockRestore();
  });

  it("shows popular skills when API is available", async () => {
    mockApiRequest.mockResolvedValue({
      data: [
        { slug: "review-code", name: "Review Code", description: "AI code review" },
      ],
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Review Code");
    expect(output).toContain("review-code");
    log.mockRestore();
  });

  it("handles API failure gracefully", async () => {
    mockApiRequest.mockRejectedValue(new Error("Network error"));

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    // Should not throw, should still show next steps
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Next steps");
    log.mockRestore();
  });

  it("shows MCP setup for Claude Code", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("claude mcp add");
    log.mockRestore();
  });

  it("shows next steps", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await initCommand.parseAsync(["node", "init"], { from: "node" });

    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("skills-hub search");
    expect(output).toContain("skills-hub install");
    expect(output).toContain("skills-hub publish");
    log.mockRestore();
  });
});
