import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill, testPrisma } from "../../test/setup.js";
import * as reviewService from "./review.service.js";

setupIntegrationTest();

describe("review service (integration)", () => {
  it("creates a review and updates skill denormalized counters", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review = await reviewService.createReview(reviewer.id, skill.slug, {
      rating: 4,
      title: "Great skill",
      body: "Works perfectly for my use case",
      usedFor: "CI/CD pipelines",
    });

    expect(review.rating).toBe(4);
    expect(review.title).toBe("Great skill");
    expect(review.author.username).toContain("testuser");
    expect(review.helpfulCount).toBe(0);
    expect(review.response).toBeNull();

    // Verify denormalized counters on skill
    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.avgRating).toBe(4);
    expect(dbSkill.reviewCount).toBe(1);
  });

  it("lists reviews with batch vote counts", async () => {
    const author = await createTestUser();
    const r1 = await createTestUser();
    const r2 = await createTestUser();
    const voter = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await reviewService.createReview(r1.id, skill.slug, { rating: 5, title: "Love it" });
    const review2 = await reviewService.createReview(r2.id, skill.slug, { rating: 3, title: "OK" });

    // Vote on review2
    await reviewService.voteReview(voter.id, review2.id, true);

    const reviews = await reviewService.listReviews(skill.slug, voter.id);
    expect(reviews.length).toBe(2);

    const votedReview = reviews.find((r) => r.id === review2.id)!;
    expect(votedReview.helpfulCount).toBe(1);
    expect(votedReview.userVote).toBe(true);
  });

  it("computes review stats with distribution", async () => {
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    // Create reviewers and reviews with various ratings
    for (const rating of [5, 4, 4, 3, 1]) {
      const reviewer = await createTestUser();
      await reviewService.createReview(reviewer.id, skill.slug, { rating });
    }

    const stats = await reviewService.getReviewStats(skill.slug);
    expect(stats.totalReviews).toBe(5);
    expect(stats.avgRating).toBeCloseTo(3.4, 1);
    expect(stats.distribution[5]).toBe(1);
    expect(stats.distribution[4]).toBe(2);
    expect(stats.distribution[3]).toBe(1);
    expect(stats.distribution[2]).toBe(0);
    expect(stats.distribution[1]).toBe(1);
  });

  it("prevents reviewing own skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    await expect(
      reviewService.createReview(user.id, skill.slug, { rating: 5 }),
    ).rejects.toThrow("own skill");
  });

  it("prevents duplicate reviews", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    await reviewService.createReview(reviewer.id, skill.slug, { rating: 4 });
    await expect(
      reviewService.createReview(reviewer.id, skill.slug, { rating: 5 }),
    ).rejects.toThrow("already reviewed");
  });

  it("updates a review and recalculates avg rating", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review = await reviewService.createReview(reviewer.id, skill.slug, { rating: 3 });
    await reviewService.updateReview(reviewer.id, review.id, { rating: 5 });

    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.avgRating).toBe(5);
  });

  it("deletes a review and recalculates counters", async () => {
    const author = await createTestUser();
    const r1 = await createTestUser();
    const r2 = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review1 = await reviewService.createReview(r1.id, skill.slug, { rating: 4 });
    await reviewService.createReview(r2.id, skill.slug, { rating: 2 });

    await reviewService.deleteReview(r1.id, review1.id);

    const dbSkill = await testPrisma.skill.findUniqueOrThrow({ where: { id: skill.id } });
    expect(dbSkill.reviewCount).toBe(1);
    expect(dbSkill.avgRating).toBe(2);
  });

  it("allows skill author to respond to a review", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review = await reviewService.createReview(reviewer.id, skill.slug, { rating: 4 });
    await reviewService.respondToReview(author.id, review.id, "Thanks for the feedback!");

    const reviews = await reviewService.listReviews(skill.slug, null);
    const r = reviews.find((rev) => rev.id === review.id)!;
    expect(r.response).toBeTruthy();
    expect(r.response!.body).toBe("Thanks for the feedback!");
  });

  it("switches vote from helpful to not-helpful", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const voter = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review = await reviewService.createReview(reviewer.id, skill.slug, { rating: 4 });

    // Vote helpful
    await reviewService.voteReview(voter.id, review.id, true);
    let reviews = await reviewService.listReviews(skill.slug, voter.id);
    let r = reviews.find((rev) => rev.id === review.id)!;
    expect(r.helpfulCount).toBe(1);
    expect(r.notHelpfulCount).toBe(0);
    expect(r.userVote).toBe(true);

    // Switch to not-helpful
    await reviewService.voteReview(voter.id, review.id, false);
    reviews = await reviewService.listReviews(skill.slug, voter.id);
    r = reviews.find((rev) => rev.id === review.id)!;
    expect(r.helpfulCount).toBe(0);
    expect(r.notHelpfulCount).toBe(1);
    expect(r.userVote).toBe(false);
  });

  it("prevents non-author from responding to a review", async () => {
    const author = await createTestUser();
    const reviewer = await createTestUser();
    const other = await createTestUser();
    const skill = await createTestSkill(author.id, "build");

    const review = await reviewService.createReview(reviewer.id, skill.slug, { rating: 4 });

    await expect(
      reviewService.respondToReview(other.id, review.id, "Not my skill"),
    ).rejects.toThrow("skill author");
  });
});
