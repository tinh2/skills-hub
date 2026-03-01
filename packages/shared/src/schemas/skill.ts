import { z } from "zod";
import { CATEGORY_SLUGS } from "../constants/categories.js";
import { PLATFORMS } from "../constants/platforms.js";
import { VISIBILITY } from "../constants/visibility.js";

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  instructions: z.string().min(50).max(8_000_000), // 8MB max
  visibility: z.enum(VISIBILITY).default("PUBLIC"),
  version: z
    .string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Version must follow semver (e.g., 1.0.0)")
    .default("1.0.0"),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  githubRepoUrl: z.string().url().optional(),
  orgSlug: z.string().optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
  visibility: z.enum(VISIBILITY).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  githubRepoUrl: z.string().url().nullable().optional(),
});

export const importGithubSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().default("main"),
});

export const skillQuerySchema = z.object({
  q: z.string().optional(),
  author: z.string().optional(),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  platform: z.enum(PLATFORMS).optional(),
  visibility: z.enum(VISIBILITY).optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).optional(),
  org: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z
    .enum(["newest", "most_installed", "most_liked", "highest_rated", "recently_updated"])
    .default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const compositionSchema = z.object({
  description: z.string().max(1000).optional(),
  children: z
    .array(
      z.object({
        skillSlug: z.string().min(1),
        sortOrder: z.number().int().min(0).default(0),
        isParallel: z.boolean().default(false),
      }),
    )
    .min(2, "A composition must include at least 2 skills")
    .max(20, "A composition can include at most 20 skills"),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type ImportGithubInput = z.infer<typeof importGithubSchema>;
export type SkillQuery = z.infer<typeof skillQuerySchema>;
export type CompositionInput = z.infer<typeof compositionSchema>;
