import { describe, it, expect } from "vitest";
import { setupE2ETest, getApp, authHeaders, createTestUser, createTestSkill } from "../../test/e2e-setup.js";

setupE2ETest();

describe("GET /api/v1/skills/:slug/reviews", () => {
  it("returns empty reviews for new skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    const res = await getApp().inject({
      method: "GET",
      url: `/api/v1/skills/${skill.slug}/reviews`,
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(0);
    expect(body).toHaveProperty("hasMore");
  });
});

describe("POST /api/v1/skills/:slug/reviews", () => {
  it("creates a review for another user's skill", async () => {
    const author = await createTestUser({ username: "author" });
    const reviewer = await createTestUser({ username: "reviewer" });
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(reviewer.id, reviewer.username);

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers,
      payload: {
        rating: 4,
        title: "Good skill",
        body: "Very helpful for my workflow",
      },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.rating).toBe(4);
    expect(body.title).toBe("Good skill");
    expect(body.author.username).toBe("reviewer");
  });

  it("prevents reviewing own skill", async () => {
    const author = await createTestUser();
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(author.id, author.username);

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers,
      payload: { rating: 5 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("prevents duplicate review", async () => {
    const author = await createTestUser({ username: "author" });
    const reviewer = await createTestUser({ username: "reviewer" });
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(reviewer.id, reviewer.username);

    // First review
    await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers,
      payload: { rating: 4 },
    });

    // Duplicate
    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers,
      payload: { rating: 5 },
    });
    expect(res.statusCode).toBe(409);
  });

  it("returns 401 without auth", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      payload: { rating: 3 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid rating", async () => {
    const author = await createTestUser({ username: "author" });
    const reviewer = await createTestUser({ username: "reviewer" });
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(reviewer.id, reviewer.username);

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers,
      payload: { rating: 6 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/v1/skills/reviews/:id/vote", () => {
  it("votes on a review", async () => {
    const author = await createTestUser({ username: "author" });
    const reviewer = await createTestUser({ username: "reviewer" });
    const voter = await createTestUser({ username: "voter" });
    const skill = await createTestSkill(author.id, "build");

    // Create a review
    const reviewRes = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers: await authHeaders(reviewer.id, reviewer.username),
      payload: { rating: 4 },
    });
    const reviewId = reviewRes.json().id;

    // Vote
    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/reviews/${reviewId}/vote`,
      headers: await authHeaders(voter.id, voter.username),
      payload: { helpful: true },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("POST /api/v1/skills/reviews/:id/response", () => {
  it("allows skill author to respond", async () => {
    const author = await createTestUser({ username: "author" });
    const reviewer = await createTestUser({ username: "reviewer" });
    const skill = await createTestSkill(author.id, "build");

    // Create a review
    const reviewRes = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/reviews`,
      headers: await authHeaders(reviewer.id, reviewer.username),
      payload: { rating: 3, body: "Could be better" },
    });
    const reviewId = reviewRes.json().id;

    // Author responds
    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/reviews/${reviewId}/response`,
      headers: await authHeaders(author.id, author.username),
      payload: { body: "Thanks for the feedback!" },
    });
    expect(res.statusCode).toBe(200);
  });
});
