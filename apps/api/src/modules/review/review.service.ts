import { prisma } from "../../common/db.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../common/errors.js";
import type { CreateReviewInput, UpdateReviewInput, ReviewSummary, ReviewStats } from "@skills-hub/shared";

export async function listReviews(
  slug: string,
  currentUserId: string | null,
  limit = 50,
): Promise<ReviewSummary[]> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");

  const reviews = await prisma.review.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { username: true, avatarUrl: true } },
      _count: { select: { votes: true } },
      response: true,
    },
  });

  if (reviews.length === 0) return [];

  // Batch compute vote counts per review using groupBy
  const reviewIds = reviews.map((r) => r.id);
  const voteCounts = await prisma.reviewVote.groupBy({
    by: ["reviewId", "helpful"],
    where: { reviewId: { in: reviewIds } },
    _count: true,
  });

  const helpfulMap = new Map<string, number>();
  const notHelpfulMap = new Map<string, number>();
  for (const vc of voteCounts) {
    if (vc.helpful) {
      helpfulMap.set(vc.reviewId, vc._count);
    } else {
      notHelpfulMap.set(vc.reviewId, vc._count);
    }
  }

  // Batch check current user's votes
  let userVoteMap = new Map<string, boolean>();
  if (currentUserId) {
    const userVotes = await prisma.reviewVote.findMany({
      where: { reviewId: { in: reviewIds }, userId: currentUserId },
      select: { reviewId: true, helpful: true },
    });
    userVoteMap = new Map(userVotes.map((v) => [v.reviewId, v.helpful]));
  }

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    usedFor: r.usedFor,
    author: r.author,
    helpfulCount: helpfulMap.get(r.id) ?? 0,
    notHelpfulCount: notHelpfulMap.get(r.id) ?? 0,
    userVote: userVoteMap.get(r.id) ?? null,
    response: r.response ? { body: r.response.body, createdAt: r.response.createdAt.toISOString() } : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getReviewStats(slug: string): Promise<ReviewStats> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");

  const reviews = await prisma.review.findMany({
    where: { skillId: skill.id },
    select: { rating: true },
  });

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let total = 0;
  for (const r of reviews) {
    distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
    total += r.rating;
  }

  return {
    avgRating: reviews.length > 0 ? total / reviews.length : 0,
    totalReviews: reviews.length,
    distribution,
  };
}

export async function createReview(
  userId: string,
  slug: string,
  input: CreateReviewInput,
): Promise<ReviewSummary> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId === userId) throw new ForbiddenError("You cannot review your own skill");

  const existing = await prisma.review.findUnique({
    where: { skillId_authorId: { skillId: skill.id, authorId: userId } },
  });
  if (existing) throw new ConflictError("You have already reviewed this skill");

  const review = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        skillId: skill.id,
        authorId: userId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        usedFor: input.usedFor,
      },
      include: {
        author: { select: { username: true, avatarUrl: true } },
      },
    });

    // Update denormalized counters
    const stats = await tx.review.aggregate({
      where: { skillId: skill.id },
      _avg: { rating: true },
      _count: true,
    });

    await tx.skill.update({
      where: { id: skill.id },
      data: {
        avgRating: stats._avg.rating,
        reviewCount: stats._count,
      },
    });

    return review;
  });

  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    usedFor: review.usedFor,
    author: review.author,
    helpfulCount: 0,
    notHelpfulCount: 0,
    userVote: null,
    response: null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export async function updateReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput,
): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review");
  if (review.authorId !== userId) throw new ForbiddenError("You can only edit your own reviews");

  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: reviewId }, data: input });

    if (input.rating !== undefined) {
      const stats = await tx.review.aggregate({
        where: { skillId: review.skillId },
        _avg: { rating: true },
      });
      await tx.skill.update({
        where: { id: review.skillId },
        data: { avgRating: stats._avg.rating },
      });
    }
  });
}

export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review");
  if (review.authorId !== userId) throw new ForbiddenError("You can only delete your own reviews");

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });

    const stats = await tx.review.aggregate({
      where: { skillId: review.skillId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.skill.update({
      where: { id: review.skillId },
      data: {
        avgRating: stats._avg.rating ?? null,
        reviewCount: stats._count,
      },
    });
  });
}

export async function voteReview(
  userId: string,
  reviewId: string,
  helpful: boolean,
): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review");

  await prisma.reviewVote.upsert({
    where: { reviewId_userId: { reviewId, userId } },
    create: { reviewId, userId, helpful },
    update: { helpful },
  });
}

export async function respondToReview(
  userId: string,
  reviewId: string,
  body: string,
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { skill: { select: { authorId: true } } },
  });
  if (!review) throw new NotFoundError("Review");
  if (review.skill.authorId !== userId) {
    throw new ForbiddenError("Only the skill author can respond to reviews");
  }

  await prisma.reviewResponse.upsert({
    where: { reviewId },
    create: { reviewId, body },
    update: { body },
  });
}
