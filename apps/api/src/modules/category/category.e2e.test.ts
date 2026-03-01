import { describe, it, expect } from "vitest";
import { setupE2ETest, getApp, createTestUser, createTestSkill } from "../../test/e2e-setup.js";

setupE2ETest();

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await getApp().inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/v1/categories", () => {
  it("returns seeded categories", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/categories",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(6);
    expect(body[0]).toHaveProperty("slug");
    expect(body[0]).toHaveProperty("name");
  });
});

describe("GET /api/v1/categories/featured", () => {
  it("returns featured skills per category", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { installCount: 100 });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/categories/featured",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(typeof body).toBe("object");
    // The build category should have a featured skill
    expect(body.build).toBeTruthy();
    expect(body.build.installCount).toBe(100);
  });
});

describe("GET /api/v1/search", () => {
  it("searches skills by query", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", {
      name: "Docker Deployer",
      description: "Deploy applications with Docker containers easily",
    });
    await createTestSkill(user.id, "test", {
      name: "Unit Tester",
      description: "Generate comprehensive unit test coverage",
    });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/search?q=docker",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].name).toBe("Docker Deployer");
  });

  it("returns empty for no match", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/search?q=zzzznonexistent",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(0);
  });
});

describe("GET /api/v1/search/suggestions", () => {
  it("returns skill name suggestions", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Kubernetes Helper" });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/search/suggestions?q=kuber",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveProperty("skills");
    expect(body).toHaveProperty("tags");
  });
});

describe("GET /api/v1/tags", () => {
  it("returns tag list", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/tags",
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});
