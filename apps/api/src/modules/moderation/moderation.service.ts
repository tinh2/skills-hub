import { prisma } from "../../common/db.js";
import { NotFoundError, ValidationError } from "../../common/errors.js";
import { refreshTrustLevel } from "./trust.service.js";

interface FlaggedSkillSummary {
  slug: string;
  name: string;
  authorUsername: string;
  status: string;
  reviewReason: string | null;
  flaggedForReview: boolean;
  pendingReportCount: number;
  createdAt: string;
}

export async function listFlaggedSkills(
  limit = 50,
  cursor?: string,
): Promise<{ data: FlaggedSkillSummary[]; cursor: string | null; hasMore: boolean }> {
  const findArgs: any = {
    where: {
      OR: [
        { flaggedForReview: true },
        { status: "PENDING_REVIEW" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      slug: true,
      name: true,
      status: true,
      reviewReason: true,
      flaggedForReview: true,
      createdAt: true,
      author: { select: { username: true } },
      _count: { select: { reports: { where: { status: "PENDING" } } } },
    },
  };

  if (cursor) {
    findArgs.cursor = { slug: cursor };
    findArgs.skip = 1;
  }

  const skills = await prisma.skill.findMany(findArgs);
  const hasMore = skills.length > limit;
  const data = skills.slice(0, limit);

  return {
    data: data.map((s: any) => ({
      slug: s.slug,
      name: s.name,
      authorUsername: s.author.username,
      status: s.status,
      reviewReason: s.reviewReason,
      flaggedForReview: s.flaggedForReview,
      pendingReportCount: s._count.reports,
      createdAt: s.createdAt.toISOString(),
    })),
    cursor: hasMore ? data[data.length - 1].slug : null,
    hasMore,
  };
}

export async function approveSkill(adminUserId: string, slug: string): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, status: true, authorId: true },
  });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.status !== "PENDING_REVIEW") {
    throw new ValidationError("Only skills in PENDING_REVIEW can be approved");
  }

  await prisma.skill.update({
    where: { id: skill.id },
    data: {
      status: "PUBLISHED",
      flaggedForReview: false,
      reviewReason: null,
      moderatedAt: new Date(),
      moderatedBy: adminUserId,
    },
  });

  // Refresh author's trust level after publishing
  await refreshTrustLevel(skill.authorId).catch(() => {});
}

export async function rejectSkill(
  adminUserId: string,
  slug: string,
  reason?: string,
): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, status: true, authorId: true },
  });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.status !== "PENDING_REVIEW") {
    throw new ValidationError("Only skills in PENDING_REVIEW can be rejected");
  }

  await prisma.skill.update({
    where: { id: skill.id },
    data: {
      status: "DRAFT",
      flaggedForReview: false,
      reviewReason: reason ?? "Rejected by moderator",
      moderatedAt: new Date(),
      moderatedBy: adminUserId,
    },
  });

  // Refresh author's trust level after status change
  await refreshTrustLevel(skill.authorId).catch(() => {});
}
