import { prisma } from "../../common/db.js";
import { TRUST_THRESHOLDS } from "@skills-hub/shared";
import type { TrustLevel } from "@skills-hub/shared";

/**
 * Compute the trust level for a user based on:
 * - Account age
 * - Number of published skills
 * - Average quality score of published skills
 * - Number of unresolved reports against their skills
 */
export async function computeTrustLevel(userId: string): Promise<TrustLevel> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, isAdmin: true },
  });
  if (!user) return "NEW";

  // Admins are always TRUSTED
  if (user.isAdmin) return "TRUSTED";

  const accountAgeDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Count published skills
  const publishedCount = await prisma.skill.count({
    where: { authorId: userId, status: "PUBLISHED" },
  });

  // Average quality score of published skills
  const avgScore = await prisma.skill.aggregate({
    where: { authorId: userId, status: "PUBLISHED", qualityScore: { not: null } },
    _avg: { qualityScore: true },
  });
  const avgQuality = avgScore._avg.qualityScore ?? 0;

  // Count unresolved reports against user's skills
  const unresolvedReports = await prisma.skillReport.count({
    where: {
      skill: { authorId: userId },
      status: "PENDING",
    },
  });

  // Downgrade if too many unresolved reports
  if (unresolvedReports >= TRUST_THRESHOLDS.MAX_UNRESOLVED_REPORTS) {
    return "NEW";
  }

  // Check TRUSTED threshold
  if (
    publishedCount >= TRUST_THRESHOLDS.TRUSTED_MIN_PUBLISHED &&
    avgQuality >= TRUST_THRESHOLDS.TRUSTED_MIN_AVG_SCORE &&
    accountAgeDays >= TRUST_THRESHOLDS.TRUSTED_MIN_ACCOUNT_AGE_DAYS
  ) {
    return "TRUSTED";
  }

  // Check ESTABLISHED threshold
  if (
    publishedCount >= TRUST_THRESHOLDS.ESTABLISHED_MIN_PUBLISHED &&
    avgQuality >= TRUST_THRESHOLDS.ESTABLISHED_MIN_AVG_SCORE &&
    accountAgeDays >= TRUST_THRESHOLDS.ESTABLISHED_MIN_ACCOUNT_AGE_DAYS
  ) {
    return "ESTABLISHED";
  }

  return "NEW";
}

/**
 * Recompute and persist trust level for a user.
 * Call this after publishing a skill, receiving a report resolution, etc.
 */
export async function refreshTrustLevel(userId: string): Promise<TrustLevel> {
  const level = await computeTrustLevel(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { trustLevel: level },
  });
  return level;
}
