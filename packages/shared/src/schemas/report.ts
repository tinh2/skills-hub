import { z } from "zod";

const REPORT_REASONS = [
  "MALICIOUS",
  "SPAM",
  "INAPPROPRIATE",
  "COPYRIGHT",
  "MISLEADING",
  "OTHER",
] as const;

export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  description: z.string().min(10).max(2000),
});

export const resolveReportSchema = z.object({
  action: z.enum(["DISMISS", "UNPUBLISH", "ARCHIVE"]),
  note: z.string().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
