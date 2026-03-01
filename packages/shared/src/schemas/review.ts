import { z } from "zod";
import { RATING } from "../constants/scoring.js";

export const createReviewSchema = z.object({
  rating: z.number().int().min(RATING.MIN).max(RATING.MAX),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  usedFor: z.string().max(500).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(RATING.MIN).max(RATING.MAX).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  usedFor: z.string().max(500).optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: "At least one field is required" },
);

export const reviewVoteSchema = z.object({
  helpful: z.boolean(),
});

export const reviewResponseSchema = z.object({
  body: z.string().min(1).max(5000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewVoteInput = z.infer<typeof reviewVoteSchema>;
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
