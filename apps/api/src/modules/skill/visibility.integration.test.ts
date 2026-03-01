import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as skillService from "./skill.service.js";

setupIntegrationTest();

describe("skill visibility (integration)", () => {
  it("private skill visible to author", async () => {
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build", { visibility: "PRIVATE" });

    const detail = await skillService.getSkillBySlug(skill.slug, author.id);
    expect(detail.name).toBe(skill.name);
  });

  it("private skill hidden from other users", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const skill = await createTestSkill(author.id, "build", { visibility: "PRIVATE" });

    await expect(skillService.getSkillBySlug(skill.slug, other.id)).rejects.toThrow("not found");
  });

  it("private skill hidden from unauthenticated users", async () => {
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build", { visibility: "PRIVATE" });

    await expect(skillService.getSkillBySlug(skill.slug)).rejects.toThrow("not found");
  });

  it("ORG skill visible to org members", async () => {
    const author = await createTestUser();
    const member = await createTestUser();

    // Create org and add both users
    const org = await testPrisma.organization.create({
      data: { slug: "test-org", name: "Test Org" },
    });
    await testPrisma.orgMembership.createMany({
      data: [
        { orgId: org.id, userId: author.id, role: "ADMIN" },
        { orgId: org.id, userId: member.id, role: "MEMBER" },
      ],
    });

    const skill = await testPrisma.skill.create({
      data: {
        slug: "org-skill",
        name: "Org Skill",
        description: "An org skill",
        categoryId: (await testPrisma.category.findUniqueOrThrow({ where: { slug: "build" } })).id,
        authorId: author.id,
        orgId: org.id,
        status: "PUBLISHED",
        visibility: "ORG",
        platforms: ["CLAUDE_CODE"],
        qualityScore: 75,
      },
    });
    await testPrisma.skillVersion.create({
      data: {
        skillId: skill.id,
        version: "1.0.0",
        instructions: "Org instructions",
        isLatest: true,
      },
    });

    const detail = await skillService.getSkillBySlug(skill.slug, member.id);
    expect(detail.name).toBe("Org Skill");
  });

  it("ORG skill hidden from non-members", async () => {
    const author = await createTestUser();
    const outsider = await createTestUser();

    const org = await testPrisma.organization.create({
      data: { slug: "private-org", name: "Private Org" },
    });
    await testPrisma.orgMembership.create({
      data: { orgId: org.id, userId: author.id, role: "ADMIN" },
    });

    const category = await testPrisma.category.findUniqueOrThrow({ where: { slug: "build" } });
    const skill = await testPrisma.skill.create({
      data: {
        slug: "hidden-org-skill",
        name: "Hidden Org Skill",
        description: "Should not be visible",
        categoryId: category.id,
        authorId: author.id,
        orgId: org.id,
        status: "PUBLISHED",
        visibility: "ORG",
        platforms: ["CLAUDE_CODE"],
        qualityScore: 75,
      },
    });
    await testPrisma.skillVersion.create({
      data: {
        skillId: skill.id,
        version: "1.0.0",
        instructions: "Hidden",
        isLatest: true,
      },
    });

    await expect(skillService.getSkillBySlug(skill.slug, outsider.id)).rejects.toThrow("not found");
  });

  it("listSkills only shows PUBLIC published skills by default", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Public", slug: "public-skill" });
    await createTestSkill(user.id, "build", { name: "Private", slug: "private-skill", visibility: "PRIVATE" });
    await createTestSkill(user.id, "build", { name: "Unlisted", slug: "unlisted-skill", visibility: "UNLISTED" });

    const result = await skillService.listSkills({ limit: 10, sort: "newest" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Public");
  });

  it("author can list their own PRIVATE skills", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "My Private", slug: "my-priv", visibility: "PRIVATE" });

    const result = await skillService.listSkills(
      { limit: 10, sort: "newest", visibility: "PRIVATE" },
      user.id,
    );
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("My Private");
  });
});
