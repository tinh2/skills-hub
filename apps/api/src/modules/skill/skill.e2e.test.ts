import { describe, it, expect } from "vitest";
import { setupE2ETest, getApp, authHeaders, createTestUser, createTestSkill } from "../../test/e2e-setup.js";

setupE2ETest();

const VALID_SKILL = {
  name: "E2E Test Skill",
  description: "A skill created via E2E tests to verify the full HTTP pipeline",
  categorySlug: "build",
  platforms: ["CLAUDE_CODE"],
  instructions: "Follow these instructions to do something useful. ".repeat(3),
};

describe("GET /api/v1/skills", () => {
  it("returns paginated list of public skills", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build");
    await createTestSkill(user.id, "test");

    const res = await getApp().inject({ method: "GET", url: "/api/v1/skills" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body).toHaveProperty("hasMore");
    expect(body.data[0]).toHaveProperty("slug");
    expect(body.data[0]).toHaveProperty("name");
    expect(body.data[0]).toHaveProperty("author");
    expect(body.data[0]).toHaveProperty("category");
  });

  it("supports sort=most_installed", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { installCount: 10, name: "Popular" });
    await createTestSkill(user.id, "test", { installCount: 1, name: "Unpopular" });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/skills?sort=most_installed",
    });
    const body = res.json();
    expect(body.data[0].name).toBe("Popular");
  });

  it("supports limit parameter", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build");
    await createTestSkill(user.id, "test");
    await createTestSkill(user.id, "qa");

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/skills?limit=2",
    });
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.hasMore).toBe(true);
  });

  it("filters by category", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Build Skill" });
    await createTestSkill(user.id, "test", { name: "Test Skill" });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/skills?category=build",
    });
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Build Skill");
  });
});

describe("GET /api/v1/skills/:slug", () => {
  it("returns skill detail with versions and media", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { slug: "my-skill" });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/skills/my-skill",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.slug).toBe("my-skill");
    expect(body).toHaveProperty("instructions");
    expect(body).toHaveProperty("versions");
    expect(body).toHaveProperty("media");
    expect(body).toHaveProperty("composition");
    expect(body.versions).toHaveLength(1);
  });

  it("returns 404 for nonexistent skill", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/skills/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/v1/skills", () => {
  it("creates a skill when authenticated", async () => {
    const user = await createTestUser();
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "POST",
      url: "/api/v1/skills",
      headers,
      payload: VALID_SKILL,
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.name).toBe("E2E Test Skill");
    expect(body.status).toBe("DRAFT");
    expect(body.slug).toBeTruthy();
  });

  it("returns 401 without auth", async () => {
    const res = await getApp().inject({
      method: "POST",
      url: "/api/v1/skills",
      payload: VALID_SKILL,
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const user = await createTestUser();
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "POST",
      url: "/api/v1/skills",
      headers,
      payload: { name: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /api/v1/skills/:slug", () => {
  it("updates own skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "PATCH",
      url: `/api/v1/skills/${skill.slug}`,
      headers,
      payload: { name: "Updated Name" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Updated Name");
  });

  it("returns 403 for other user's skill", async () => {
    const author = await createTestUser({ username: "author" });
    const other = await createTestUser({ username: "other" });
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(other.id, other.username);

    const res = await getApp().inject({
      method: "PATCH",
      url: `/api/v1/skills/${skill.slug}`,
      headers,
      payload: { name: "Hijacked" },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("POST /api/v1/skills/:slug/publish", () => {
  it("publishes a draft skill", async () => {
    const user = await createTestUser();
    const headers = await authHeaders(user.id, user.username);

    // Create via API (returns DRAFT)
    const createRes = await getApp().inject({
      method: "POST",
      url: "/api/v1/skills",
      headers,
      payload: VALID_SKILL,
    });
    const slug = createRes.json().slug;

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${slug}/publish`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("PUBLISHED");
  });
});

describe("DELETE /api/v1/skills/:slug", () => {
  it("archives a skill", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "DELETE",
      url: `/api/v1/skills/${skill.slug}`,
      headers,
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("POST /api/v1/skills/:slug/like", () => {
  it("toggles like on a skill", async () => {
    const author = await createTestUser({ username: "author" });
    const liker = await createTestUser({ username: "liker" });
    const skill = await createTestSkill(author.id, "build");
    const headers = await authHeaders(liker.id, liker.username);

    const res1 = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/like`,
      headers,
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().liked).toBe(true);
    expect(res1.json().likeCount).toBe(1);

    // Toggle off
    const res2 = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/like`,
      headers,
    });
    expect(res2.json().liked).toBe(false);
    expect(res2.json().likeCount).toBe(0);
  });
});

describe("POST /api/v1/skills/:slug/install", () => {
  it("records an install", async () => {
    const user = await createTestUser();
    const skill = await createTestSkill(user.id, "build");

    const res = await getApp().inject({
      method: "POST",
      url: `/api/v1/skills/${skill.slug}/install`,
      payload: { platform: "CLAUDE_CODE" },
    });
    expect(res.statusCode).toBe(200);
  });
});
