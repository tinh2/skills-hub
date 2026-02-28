import type { Platform } from "../constants/platforms.js";

export type SkillStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";

export interface SkillSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { name: string; slug: string };
  author: { username: string; avatarUrl: string | null };
  status: SkillStatus;
  platforms: Platform[];
  qualityScore: number | null;
  installCount: number;
  avgRating: number | null;
  reviewCount: number;
  latestVersion: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetail extends SkillSummary {
  instructions: string;
  githubRepoUrl: string | null;
  versions: VersionSummary[];
}

export interface VersionSummary {
  id: string;
  version: string;
  changelog: string | null;
  qualityScore: number | null;
  createdAt: string;
}

export interface VersionDetail extends VersionSummary {
  instructions: string;
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  diff: string;
}
