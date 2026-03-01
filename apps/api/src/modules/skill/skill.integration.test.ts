import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as skillService from "./skill.service.js";

setupIntegrationTest();

describe("skill service (integration)", () => {
  it("creates a skill with tags and version", async () => {
    const user = await createTestUser();

    const result = await skillService.createSkill(user.id, {
      name: "My Cool Skill",
      description: "A skill for testing",
      categorySlug: "build",
      version: "1.0.0",
      instructions: "Run this skill to build things.",
      platforms: ["CLAUDE_CODE"],
      tags: ["testing", "build"],
      visibility: "PUBLIC",
    });

    expect(result.name).toBe("My Cool Skill");
    expect(result.slug).toBe("my-cool-skill");
    expect(result.category.slug).toBe("build");
    expect(result.author.username).toContain("testuser");
    expect(result.tags).toContain("testing");
    expect(result.tags).toContain("build");
    expect(result.latestVersion).toBe("1.0.0");
    expect(result.status).toBe("DRAFT");
    expect(result.qualityScore).toBeGreaterThan(0);

    // Verify in database
    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { slug: "my-cool-skill" } });
    expect(dbSkill.description).toBe("A skill for testing");
  });

  it("gets a skill by slug with full detail", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build", { name: "Detail Skill" });

    const detail = await skillService.getSkillBySlug(skill.slug, user.id);

    expect(detail.name).toBe("Detail Skill");
    expect(detail.instructions).toBeTruthy();
    expect(detail.versions.length).toBeGreaterThanOrEqual(1);
    expect(detail.media).toEqual([]);
  });

  it("lists published PUBLIC skills with pagination", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Skill A", slug: "skill-a" });
    await createTestSkill(user.id, "test", { name: "Skill B", slug: "skill-b" });
    await createTestSkill(user.id, "build", { name: "Draft Skill", slug: "draft", status: "DRAFT" });

    const result = await skillService.listSkills({ limit: 10, sort: "newest" });

    // Only published skills returned
    expect(result.data.length).toBe(2);
    expect(result.data.map((s) => s.name)).not.toContain("Draft Skill");
    expect(result.hasMore).toBe(false);
  });

  it("cursor pagination returns correct next page", async () => {
    const user = await createTestUser();
    // Create 3 skills
    await createTestSkill(user.id, "build", { name: "S1", slug: "s-1" });
    await createTestSkill(user.id, "build", { name: "S2", slug: "s-2" });
    await createTestSkill(user.id, "build", { name: "S3", slug: "s-3" });

    const page1 = await skillService.listSkills({ limit: 2, sort: "newest" });
    expect(page1.data.length).toBe(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.cursor).toBeTruthy();

    const page2 = await skillService.listSkills({ limit: 2, sort: "newest", cursor: page1.cursor! });
    expect(page2.data.length).toBe(1);
    expect(page2.hasMore).toBe(false);
  });

  it("updates a skill's name and tags", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build", { name: "Original Name" });

    const updated = await skillService.updateSkill(user.id, skill.slug, {
      name: "Updated Name",
      tags: ["new-tag"],
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.tags).toContain("new-tag");
  });

  it("publishes a skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build", { status: "DRAFT" });

    const published = await skillService.publishSkill(user.id, skill.slug);
    expect(published.status).toBe("PUBLISHED");
  });

  it("archives a skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    await skillService.archiveSkill(user.id, skill.slug);

    const archived = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(archived.status).toBe("ARCHIVED");
  });

  it("prevents non-author from editing a skill", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await expect(
      skillService.updateSkill(other.id, skill.slug, { name: "Hacked" }),
    ).rejects.toThrow("own skills");
  });

  it("returns 404 for non-existent skill", async () => {
    await expect(skillService.getSkillBySlug("nonexistent")).rejects.toThrow("not found");
  });

  it("sorts by most_installed", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Low", slug: "low", installCount: 5 });
    await createTestSkill(user.id, "build", { name: "High", slug: "high", installCount: 100 });

    const result = await skillService.listSkills({ limit: 10, sort: "most_installed" });
    expect(result.data[0].name).toBe("High");
    expect(result.data[1].name).toBe("Low");
  });

  it("filters by category", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Build Skill", slug: "build-1" });
    await createTestSkill(user.id, "test", { name: "Test Skill", slug: "test-1" });

    const result = await skillService.listSkills({ limit: 10, sort: "newest", category: "build" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Build Skill");
  });
});
