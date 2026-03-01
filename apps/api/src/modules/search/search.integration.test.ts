import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, createTestSkill } from "../../test/setup.js";
import * as searchService from "./search.service.js";

setupIntegrationTest();

describe("search service (integration)", () => {
  it("searches skills by name (ILIKE)", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Deploy Pipeline", slug: "deploy-pipeline" });
    await createTestSkill(user.id, "build", { name: "Build Runner", slug: "build-runner" });
    await createTestSkill(user.id, "test", { name: "E2E Tester", slug: "e2e-tester" });

    const result = await searchService.searchSkills({ q: "pipeline", limit: 10, sort: "newest" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Deploy Pipeline");
  });

  it("case-insensitive search", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Flutter Builder", slug: "flutter-builder" });

    const result = await searchService.searchSkills({ q: "FLUTTER", limit: 10, sort: "newest" });
    expect(result.data.length).toBe(1);
  });

  it("filters by category", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Build Skill", slug: "build-s" });
    await createTestSkill(user.id, "test", { name: "Test Skill", slug: "test-s" });

    const result = await searchService.searchSkills({ category: "test", limit: 10, sort: "newest" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Test Skill");
  });

  it("excludes non-published and non-public skills", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Published", slug: "pub" });
    await createTestSkill(user.id, "build", { name: "Draft", slug: "draft", status: "DRAFT" });
    await createTestSkill(user.id, "build", { name: "Private", slug: "private", visibility: "PRIVATE" });

    const result = await searchService.searchSkills({ limit: 10, sort: "newest" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe("Published");
  });

  it("sorts by most_liked", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Popular", slug: "popular", likeCount: 50 });
    await createTestSkill(user.id, "build", { name: "Unpopular", slug: "unpopular", likeCount: 2 });

    const result = await searchService.searchSkills({ limit: 10, sort: "most_liked" });
    expect(result.data[0].name).toBe("Popular");
  });

  it("cursor pagination works", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      await createTestSkill(user.id, "build", { name: `Skill ${i}`, slug: `s-${i}` });
    }

    const page1 = await searchService.searchSkills({ limit: 3, sort: "newest" });
    expect(page1.data.length).toBe(3);
    expect(page1.hasMore).toBe(true);

    const page2 = await searchService.searchSkills({ limit: 3, sort: "newest", cursor: page1.cursor! });
    expect(page2.data.length).toBe(2);
    expect(page2.hasMore).toBe(false);
  });

  it("getSearchSuggestions returns matching names and tags", async () => {
    const user = await createTestUser();
    await createTestSkill(user.id, "build", { name: "Docker Builder", slug: "docker-builder" });

    const suggestions = await searchService.getSearchSuggestions("dock");
    expect(suggestions.skills.length).toBe(1);
    expect(suggestions.skills[0].name).toBe("Docker Builder");
  });
});
