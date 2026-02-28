import { describe, it, expect } from "vitest";
import { createSkillSchema, skillQuerySchema } from "./skill.js";

describe("createSkillSchema", () => {
  const valid = {
    name: "Test Skill",
    description: "A valid test skill description that is long enough",
    categorySlug: "build",
    platforms: ["CLAUDE_CODE"],
    instructions: "x".repeat(50),
  };

  it("accepts valid input with defaults", () => {
    const result = createSkillSchema.parse(valid);
    expect(result.version).toBe("1.0.0");
    expect(result.visibility).toBe("PUBLIC");
  });

  it("rejects invalid semver", () => {
    expect(() =>
      createSkillSchema.parse({ ...valid, version: "not-semver" }),
    ).toThrow();
  });

  it("rejects empty platforms", () => {
    expect(() =>
      createSkillSchema.parse({ ...valid, platforms: [] }),
    ).toThrow();
  });

  it("rejects more than 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(() =>
      createSkillSchema.parse({ ...valid, tags }),
    ).toThrow();
  });

  it("rejects name over 100 chars", () => {
    expect(() =>
      createSkillSchema.parse({ ...valid, name: "x".repeat(101) }),
    ).toThrow();
  });

  it("accepts valid semver versions", () => {
    const result = createSkillSchema.parse({ ...valid, version: "2.1.0" });
    expect(result.version).toBe("2.1.0");
  });
});

describe("skillQuerySchema", () => {
  it("applies defaults for empty input", () => {
    const result = skillQuerySchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.limit).toBe(20);
  });

  it("rejects invalid sort value", () => {
    expect(() => skillQuerySchema.parse({ sort: "invalid" })).toThrow();
  });

  it("coerces string limit to number", () => {
    const result = skillQuerySchema.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("rejects limit over 100", () => {
    expect(() => skillQuerySchema.parse({ limit: 101 })).toThrow();
  });
});
