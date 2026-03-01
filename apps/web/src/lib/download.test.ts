import { describe, it, expect } from "vitest";
import { buildSkillMd } from "./download";

const mockSkill = {
  name: "Test Skill",
  latestVersion: "1.2.0",
  category: { slug: "build" },
  platforms: ["CLAUDE_CODE"],
  tags: ["testing", "ci"],
  description: "A test skill",
  instructions: "# Instructions\n\nDo the thing.",
};

describe("buildSkillMd", () => {
  it("generates valid YAML frontmatter with instructions", () => {
    const result = buildSkillMd(mockSkill);
    expect(result).toContain("---");
    expect(result).toContain("name: Test Skill");
    expect(result).toContain("version: 1.2.0");
    expect(result).toContain("category: build");
    expect(result).toContain("platforms: [CLAUDE_CODE]");
    expect(result).toContain("tags: [testing, ci]");
    expect(result).toContain("description: A test skill");
    expect(result).toContain("# Instructions\n\nDo the thing.");
  });

  it("omits tags line when tags array is empty", () => {
    const result = buildSkillMd({ ...mockSkill, tags: [] });
    expect(result).not.toContain("tags:");
  });

  it("escapes special YAML characters in name", () => {
    const result = buildSkillMd({ ...mockSkill, name: "skill: the best!" });
    expect(result).toContain('name: "skill: the best!"');
  });

  it("escapes special YAML characters in description", () => {
    const result = buildSkillMd({ ...mockSkill, description: "Uses # and * for markdown" });
    expect(result).toContain('description: "Uses # and * for markdown"');
  });

  it("handles multiple platforms", () => {
    const result = buildSkillMd({ ...mockSkill, platforms: ["CLAUDE_CODE", "CURSOR", "WINDSURF"] });
    expect(result).toContain("platforms: [CLAUDE_CODE, CURSOR, WINDSURF]");
  });

  it("ends frontmatter before instructions", () => {
    const result = buildSkillMd(mockSkill);
    const parts = result.split("---");
    expect(parts.length).toBe(3); // before, frontmatter, after
    expect(parts[2]).toContain("# Instructions");
  });
});
