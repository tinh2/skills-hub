import { describe, it, expect } from "vitest";
import { parseSkillMd, validateSemver, compareSemver } from "./index.js";

describe("parseSkillMd", () => {
  it("parses a valid SKILL.md", () => {
    const content = `---
name: Test Skill
description: A test skill
version: 1.0.0
category: build
platforms:
  - CLAUDE_CODE
---
These are the instructions.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.skill?.name).toBe("Test Skill");
    expect(result.skill?.description).toBe("A test skill");
    expect(result.skill?.version).toBe("1.0.0");
    expect(result.skill?.category).toBe("build");
    expect(result.skill?.platforms).toEqual(["CLAUDE_CODE"]);
    expect(result.skill?.instructions).toBe("These are the instructions.");
  });

  it("fails on missing frontmatter", () => {
    const result = parseSkillMd("Just some text without frontmatter");
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe("frontmatter");
  });

  it("fails on empty content", () => {
    const result = parseSkillMd("");
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe("content");
  });

  it("fails on missing required fields", () => {
    const content = `---
description: A test skill
---
Instructions here.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "name" || e.message.includes("Required"))).toBe(true);
  });

  it("normalizes platform names", () => {
    const content = `---
name: Test
description: A test
version: 1.0.0
platforms:
  - claude code
---
Instructions.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.skill?.platforms).toEqual(["CLAUDE_CODE"]);
  });

  it("lowercases category", () => {
    const content = `---
name: Test
description: A test
version: 1.0.0
category: Build
---
Instructions.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.skill?.category).toBe("build");
  });

  it("rejects invalid category", () => {
    const content = `---
name: Test
description: A test
version: 1.0.0
category: nonexistent
---
Instructions.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "category")).toBe(true);
  });

  it("handles numeric version", () => {
    const content = `---
name: Test
description: A test
version: 1
---
Instructions.`;

    const result = parseSkillMd(content);
    expect(result.success).toBe(true);
    expect(result.skill?.version).toBe("1");
  });

  it("fails when no instructions in body or frontmatter", () => {
    const content = `---
name: Test
description: A test
version: 1.0.0
---
`;
    const result = parseSkillMd(content);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "instructions")).toBe(true);
  });
});

describe("validateSemver", () => {
  it("accepts valid semver", () => {
    expect(validateSemver("1.0.0")).toBe(true);
    expect(validateSemver("0.1.0")).toBe(true);
    expect(validateSemver("10.20.30")).toBe(true);
  });

  it("rejects invalid semver", () => {
    expect(validateSemver("1.0")).toBe(false);
    expect(validateSemver("1")).toBe(false);
    expect(validateSemver("v1.0.0")).toBe(false);
    expect(validateSemver("1.0.0-beta")).toBe(false);
    expect(validateSemver("")).toBe(false);
  });
});

describe("compareSemver", () => {
  it("returns 0 for equal versions", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });

  it("returns 1 when a > b", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBe(1);
    expect(compareSemver("1.1.0", "1.0.0")).toBe(1);
    expect(compareSemver("1.0.1", "1.0.0")).toBe(1);
  });

  it("returns -1 when a < b", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.1.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.0.1")).toBe(-1);
  });
});
