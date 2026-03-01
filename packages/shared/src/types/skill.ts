import type { Platform } from "../constants/platforms.js";
import type { Visibility } from "../constants/visibility.js";

export type SkillStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";

export interface SkillSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { name: string; slug: string };
  author: { username: string; avatarUrl: string | null };
  status: SkillStatus;
  visibility: Visibility;
  platforms: Platform[];
  qualityScore: number | null;
  installCount: number;
  likeCount: number;
  userLiked: boolean;
  avgRating: number | null;
  reviewCount: number;
  latestVersion: string;
  tags: string[];
  isComposition: boolean;
  org: { slug: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  type: "SCREENSHOT" | "YOUTUBE";
  url: string;
  caption: string | null;
  sortOrder: number;
}

export interface SkillDetail extends SkillSummary {
  instructions: string;
  githubRepoUrl: string | null;
  versions: VersionSummary[];
  composition: CompositionDetail | null;
  media: MediaItem[];
}

export interface CompositionDetail {
  description: string | null;
  children: CompositionChild[];
}

export interface CompositionChild {
  skill: { slug: string; name: string; qualityScore: number | null };
  sortOrder: number;
  isParallel: boolean;
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
