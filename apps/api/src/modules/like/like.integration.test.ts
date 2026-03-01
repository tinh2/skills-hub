import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as likeService from "./like.service.js";

setupIntegrationTest();

describe("like service (integration)", () => {
  it("toggles like on — increments count", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    const result = await likeService.toggleLike(user.id, skill.slug);

    expect(result.liked).toBe(true);
    expect(result.likeCount).toBe(1);

    // Verify in database
    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.likeCount).toBe(1);
  });

  it("toggles like off — decrements count", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    await likeService.toggleLike(user.id, skill.slug);
    const result = await likeService.toggleLike(user.id, skill.slug);

    expect(result.liked).toBe(false);
    expect(result.likeCount).toBe(0);
  });

  it("multiple users can like the same skill", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await likeService.toggleLike(user1.id, skill.slug);
    const result = await likeService.toggleLike(user2.id, skill.slug);

    expect(result.likeCount).toBe(2);
  });

  it("hasUserLiked returns correct state", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    expect(await likeService.hasUserLiked(user.id, skill.id)).toBe(false);

    await likeService.toggleLike(user.id, skill.slug);
    expect(await likeService.hasUserLiked(user.id, skill.id)).toBe(true);
  });

  it("batchHasUserLiked returns correct set", async () => {
    const user = await createTestUser();
    const s1 = await createTestSkill(user.id, "build", { slug: "batch-1" });
    const s2 = await createTestSkill(user.id, "build", { slug: "batch-2" });
    const s3 = await createTestSkill(user.id, "build", { slug: "batch-3" });

    await likeService.toggleLike(user.id, s1.slug);
    await likeService.toggleLike(user.id, s3.slug);

    const liked = await likeService.batchHasUserLiked(user.id, [s1.id, s2.id, s3.id]);
    expect(liked.has(s1.id)).toBe(true);
    expect(liked.has(s2.id)).toBe(false);
    expect(liked.has(s3.id)).toBe(true);
  });

  it("throws NotFoundError for non-existent skill", async () => {
    const user = await createTestUser();
    await expect(likeService.toggleLike(user.id, "no-such-skill")).rejects.toThrow("not found");
  });
});
