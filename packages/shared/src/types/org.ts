import type { OrgRole } from "../constants/org.js";

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  skillCount: number;
  createdAt: string;
}

export interface OrgDetail extends OrgSummary {
  githubOrg: string | null;
  totalInstalls: number;
  currentUserRole: OrgRole | null;
  updatedAt: string;
}

export interface OrgMember {
  user: { id: string; username: string; avatarUrl: string | null };
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInviteData {
  id: string;
  inviteeUsername: string | null;
  role: OrgRole;
  status: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface OrgSkillTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  categorySlug: string | null;
  platforms: string[];
  createdAt: string;
}

export interface OrgAnalytics {
  totalSkills: number;
  totalInstalls: number;
  activeMembers: number;
  skillsByCategory: { category: string; count: number }[];
  topSkills: { slug: string; name: string; installs: number }[];
  recentInstalls: { date: string; count: number }[];
}

export interface UserOrgMembership {
  org: { slug: string; name: string; avatarUrl: string | null };
  role: OrgRole;
  joinedAt: string;
}
