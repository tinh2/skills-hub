import { describe, it, expect, vi } from "vitest";

import { categoriesCommand } from "./categories.js";

describe("categories", () => {
  it("lists all categories with descriptions", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await categoriesCommand.parseAsync(["node", "categories"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("build");
    expect(allOutput).toContain("test");
    expect(allOutput).toContain("security");
    expect(allOutput).toContain("deploy");
    log.mockRestore();
  });

  it("shows category descriptions", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await categoriesCommand.parseAsync(["node", "categories"], { from: "node" });
    const allOutput = log.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Project scaffolding");
    expect(allOutput).toContain("Unit tests");
    log.mockRestore();
  });
});
