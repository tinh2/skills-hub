import { z } from "zod";
import { CATEGORY_SLUGS } from "../constants/categories.js";
import { PLATFORMS } from "../constants/platforms.js";

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  instructions: z.string().min(50),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (e.g., 1.0.0)")
    .default("1.0.0"),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  githubRepoUrl: z.string().url().optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  githubRepoUrl: z.string().url().nullable().optional(),
});

export const importGithubSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().default("main"),
});

export const skillQuerySchema = z.object({
  q: z.string().optional(),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  platform: z.enum(PLATFORMS).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z
    .enum(["newest", "most_installed", "highest_rated", "recently_updated"])
    .default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type ImportGithubInput = z.infer<typeof importGithubSchema>;
export type SkillQuery = z.infer<typeof skillQuerySchema>;
