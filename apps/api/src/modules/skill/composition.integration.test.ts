import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as skillService from "./skill.service.js";

setupIntegrationTest();

describe("skill composition (integration)", () => {
  it("creates a composition with ordered children", async () => {
    const user = await createTestUser();
    const parent = await createTestSkill(user.id, "build", { name: "Pipeline", slug: "pipeline" });
    const child1 = await createTestSkill(user.id, "build", { name: "Step 1", slug: "step-1" });
    const child2 = await createTestSkill(user.id, "test", { name: "Step 2", slug: "step-2" });

    const result = await skillService.setComposition(user.id, parent.slug, {
      description: "A build pipeline",
      children: [
        { skillSlug: "step-1", sortOrder: 0, isParallel: false },
        { skillSlug: "step-2", sortOrder: 1, isParallel: true },
      ],
    });

    expect(result.composition).toBeTruthy();
    expect(result.composition!.description).toBe("A build pipeline");
    expect(result.composition!.children).toHaveLength(2);
    expect(result.composition!.children[0].skill.slug).toBe("step-1");
    expect(result.composition!.children[0].isParallel).toBe(false);
    expect(result.composition!.children[1].skill.slug).toBe("step-2");
    expect(result.composition!.children[1].isParallel).toBe(true);
  });

  it("prevents self-referencing composition", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build", { slug: "self-ref" });

    await expect(
      skillService.setComposition(user.id, skill.slug, {
        children: [{ skillSlug: "self-ref", sortOrder: 0, isParallel: false }],
      }),
    ).rejects.toThrow("cannot include itself");
  });

  it("prevents non-author from setting composition", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const skill = await createTestSkill(author.id, "build");
    const child = await createTestSkill(author.id, "build", { slug: "child-skill" });

    await expect(
      skillService.setComposition(other.id, skill.slug, {
        children: [{ skillSlug: "child-skill", sortOrder: 0, isParallel: false }],
      }),
    ).rejects.toThrow("own skills");
  });

  it("removes a composition", async () => {
    const user = await createTestUser();
    const parent = await createTestSkill(user.id, "build", { slug: "parent" });
    const child = await createTestSkill(user.id, "build", { slug: "child" });

    await skillService.setComposition(user.id, parent.slug, {
      children: [{ skillSlug: "child", sortOrder: 0, isParallel: false }],
    });

    await skillService.removeComposition(user.id, parent.slug);

    const detail = await skillService.getSkillBySlug(parent.slug, user.id);
    expect(detail.composition).toBeNull();
  });
});

describe("skill edge cases (integration)", () => {
  it("generates unique slug for duplicate names", async () => {
    const user = await createTestUser();

    const s1 = await skillService.createSkill(user.id, {
      name: "Duplicate Name",
      description: "First",
      categorySlug: "build",
      version: "1.0.0",
      instructions: "Instructions",
      platforms: ["CLAUDE_CODE"],
      visibility: "PUBLIC",
    });

    const s2 = await skillService.createSkill(user.id, {
      name: "Duplicate Name",
      description: "Second",
      categorySlug: "build",
      version: "1.0.0",
      instructions: "Instructions",
      platforms: ["CLAUDE_CODE"],
      visibility: "PUBLIC",
    });

    expect(s1.slug).toBe("duplicate-name");
    expect(s2.slug).not.toBe(s1.slug);
    expect(s2.slug).toMatch(/^duplicate-name-/);
  });

  it("rejects publish when validation fails", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build", {
      status: "DRAFT",
    });

    // Inject a TODO marker to trigger the structure.no_todos error check
    await testPrisma.skillVersion.updateMany({
      where: { skillId: skill.id },
      data: { instructions: "TODO: This skill needs real instructions. Placeholder content that is long enough to pass the minimum length check but contains a TODO marker." },
    });

    await expect(skillService.publishSkill(user.id, skill.slug)).rejects.toThrow("Cannot publish");
  });
});
