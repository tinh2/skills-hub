import type { SkillSummary, SkillDetail } from "@skills-hub-ai/shared";

export const mockSkillSummary: SkillSummary = {
  id: "skill-1",
  slug: "test-skill",
  name: "Test Skill",
  description: "A skill for testing things",
  category: { name: "Build", slug: "build" },
  author: { username: "tho", avatarUrl: null },
  status: "PUBLISHED",
  visibility: "PUBLIC",
  platforms: ["CLAUDE_CODE"],
  qualityScore: 85,
  installCount: 42,
  likeCount: 7,
  userLiked: false,
  avgRating: 4.5,
  reviewCount: 3,
  latestVersion: "1.2.0",
  tags: ["testing", "ci"],
  isComposition: false,
  org: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

export const mockSkillDetail: SkillDetail = {
  ...mockSkillSummary,
  instructions: "# Test Skill\n\nDo the thing.",
  githubRepoUrl: null,
  versions: [
    { id: "v1", version: "1.0.0", changelog: "Initial release", qualityScore: 80, createdAt: "2026-01-01T00:00:00Z" },
    { id: "v2", version: "1.2.0", changelog: "Bug fixes", qualityScore: 85, createdAt: "2026-01-15T00:00:00Z" },
  ],
  composition: null,
  media: [],
};
