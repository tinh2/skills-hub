import { z } from "zod";
import { PLATFORMS } from "../constants/platforms.js";
import { ORG_ROLES } from "../constants/org.js";

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug must be lowercase alphanumeric with optional hyphens"),
  description: z.string().max(500).optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const inviteMemberSchema = z
  .object({
    username: z.string().optional(),
    role: z.enum(ORG_ROLES).default("MEMBER"),
  })
  .refine((data) => !!data.username, {
    message: "username is required",
  });

export const updateMemberRoleSchema = z.object({
  role: z.enum(ORG_ROLES),
});

export const syncGithubOrgSchema = z.object({
  githubOrgSlug: z.string().min(1),
  defaultRole: z.enum(ORG_ROLES).default("MEMBER"),
});

export const orgQuerySchema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orgSkillQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z
    .enum(["newest", "most_installed", "most_liked", "highest_rated", "recently_updated"])
    .default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  categorySlug: z.string().optional(),
  platforms: z.array(z.enum(PLATFORMS)).optional(),
  instructions: z.string().max(50000).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  categorySlug: z.string().optional(),
  platforms: z.array(z.enum(PLATFORMS)).optional(),
  instructions: z.string().max(50000).optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type SyncGithubOrgInput = z.infer<typeof syncGithubOrgSchema>;
export type OrgQuery = z.infer<typeof orgQuerySchema>;
export type OrgSkillQuery = z.infer<typeof orgSkillQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
