import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../common/errors.js";
import { REPORT_LIMITS } from "@skills-hub/shared";
import type { CreateReportInput } from "@skills-hub/shared";
import type { SkillReportSummary } from "@skills-hub/shared";
import { refreshTrustLevel } from "../moderation/trust.service.js";

export async function createReport(
  userId: string,
  skillSlug: string,
  input: CreateReportInput,
): Promise<SkillReportSummary> {
  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    select: { id: true, name: true, authorId: true, status: true },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Only published skills can be reported
  if (skill.status !== "PUBLISHED") throw new NotFoundError("Skill");

  // Can't report your own skill
  if (skill.authorId === userId) {
    throw new ForbiddenError("You cannot report your own skill");
  }

  // Check for existing report
  const existing = await prisma.skillReport.findUnique({
    where: { skillId_reporterId: { skillId: skill.id, reporterId: userId } },
  });
  if (existing) throw new ConflictError("You have already reported this skill");

  // Check daily rate limit
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const reportsToday = await prisma.skillReport.count({
    where: { reporterId: userId, createdAt: { gte: todayStart } },
  });
  if (reportsToday >= REPORT_LIMITS.MAX_REPORTS_PER_DAY) {
    throw new ValidationError(`Maximum ${REPORT_LIMITS.MAX_REPORTS_PER_DAY} reports per day`);
  }

  // Check pending report limit
  const pendingCount = await prisma.skillReport.count({
    where: { reporterId: userId, status: "PENDING" },
  });
  if (pendingCount >= REPORT_LIMITS.MAX_PENDING_PER_USER) {
    throw new ValidationError(`Maximum ${REPORT_LIMITS.MAX_PENDING_PER_USER} pending reports allowed`);
  }

  const report = await prisma.skillReport.create({
    data: {
      skillId: skill.id,
      reporterId: userId,
      reason: input.reason,
      description: input.description,
    },
    select: reportSelect,
  });

  // Auto-flag skill if it gets 3+ pending reports
  const totalPending = await prisma.skillReport.count({
    where: { skillId: skill.id, status: "PENDING" },
  });
  if (totalPending >= 3) {
    await prisma.skill.update({
      where: { id: skill.id },
      data: { flaggedForReview: true, reviewReason: "Multiple user reports" },
    });
  }

  return formatReport(report);
}

export async function listPendingReports(
  limit = 50,
  cursor?: string,
): Promise<{ data: SkillReportSummary[]; cursor: string | null; hasMore: boolean }> {
  const findArgs: any = {
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: reportSelect,
  };

  if (cursor) {
    findArgs.cursor = { id: cursor };
    findArgs.skip = 1;
  }

  const reports = await prisma.skillReport.findMany(findArgs);
  const hasMore = reports.length > limit;
  const data = reports.slice(0, limit);

  return {
    data: data.map(formatReport),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function resolveReport(
  adminUserId: string,
  reportId: string,
  action: "DISMISS" | "UNPUBLISH" | "ARCHIVE",
  note?: string,
): Promise<void> {
  const report = await prisma.skillReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, skillId: true, skill: { select: { authorId: true } } },
  });
  if (!report) throw new NotFoundError("Report");
  if (report.status !== "PENDING") throw new ValidationError("Report already resolved");

  await prisma.$transaction(async (tx) => {
    const newStatus = action === "DISMISS" ? "DISMISSED" : "REVIEWED";
    await tx.skillReport.update({
      where: { id: reportId },
      data: { status: newStatus, resolvedAt: new Date(), resolveNote: note },
    });

    if (action === "UNPUBLISH") {
      await tx.skill.update({
        where: { id: report.skillId },
        data: {
          status: "DRAFT",
          flaggedForReview: true,
          reviewReason: "Unpublished due to report",
          moderatedAt: new Date(),
          moderatedBy: adminUserId,
        },
      });
    } else if (action === "ARCHIVE") {
      await tx.skill.update({
        where: { id: report.skillId },
        data: {
          status: "ARCHIVED",
          flaggedForReview: false,
          moderatedAt: new Date(),
          moderatedBy: adminUserId,
        },
      });
    } else {
      // Dismiss — clear flag if no more pending reports
      const remaining = await tx.skillReport.count({
        where: { skillId: report.skillId, status: "PENDING", id: { not: reportId } },
      });
      if (remaining === 0) {
        await tx.skill.update({
          where: { id: report.skillId },
          data: { flaggedForReview: false, moderatedAt: new Date(), moderatedBy: adminUserId },
        });
      }
    }
  });

  // Refresh author's trust level after report resolution (affects unresolved report count)
  await refreshTrustLevel(report.skill.authorId).catch(() => {});
}

const reportSelect = {
  id: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  skill: { select: { slug: true, name: true } },
  reporter: { select: { username: true } },
} as const;

function formatReport(row: any): SkillReportSummary {
  return {
    id: row.id,
    skillSlug: row.skill.slug,
    skillName: row.skill.name,
    reason: row.reason,
    description: row.description,
    reporterUsername: row.reporter.username,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}
