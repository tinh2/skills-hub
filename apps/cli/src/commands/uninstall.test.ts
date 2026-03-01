import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, rmSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("../lib/install-path.js", () => ({
  detectInstallTarget: vi.fn(() => ({
    type: "claude-code",
    path: "/home/user/.claude/skills",
  })),
}));

import { uninstallCommand } from "./uninstall.js";

const mockExistsSync = vi.mocked(existsSync);
const mockRmSync = vi.mocked(rmSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uninstall", () => {
  it("removes skill directory when found", async () => {
    mockExistsSync.mockReturnValue(true);
    await uninstallCommand.parseAsync(["node", "uninstall", "my-skill"], { from: "node" });
    expect(mockRmSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/my-skill",
      { recursive: true },
    );
  });

  it("exits with error when skill not found", async () => {
    mockExistsSync.mockReturnValue(false);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    await expect(uninstallCommand.parseAsync(["node", "uninstall", "nonexistent"], { from: "node" })).rejects.toThrow("exit");
    expect(mockRmSync).not.toHaveBeenCalled();
    exit.mockRestore();
  });

  it("uses detected install target path", async () => {
    mockExistsSync.mockReturnValue(true);
    await uninstallCommand.parseAsync(["node", "uninstall", "test-slug"], { from: "node" });
    expect(mockRmSync).toHaveBeenCalledWith(
      "/home/user/.claude/skills/test-slug",
      { recursive: true },
    );
  });

  it("prints success message", async () => {
    mockExistsSync.mockReturnValue(true);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await uninstallCommand.parseAsync(["node", "uninstall", "my-skill"], { from: "node" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Uninstalled my-skill"));
    log.mockRestore();
  });
});
