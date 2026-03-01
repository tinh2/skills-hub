import { z } from "zod";

export const runSandboxSchema = z.object({
  input: z.string().min(1, "Input is required").max(10_000, "Input too long (max 10,000 chars)"),
  testCaseId: z.string().optional(),
});

export const createTestCaseSchema = z.object({
  label: z.string().min(1).max(200),
  input: z.string().min(1).max(10_000),
  expectedOutput: z.string().max(50_000).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTestCaseSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  input: z.string().min(1).max(10_000).optional(),
  expectedOutput: z.string().max(50_000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type RunSandboxInput = z.infer<typeof runSandboxSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
