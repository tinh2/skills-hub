import { z } from "zod";

export const createVersionSchema = z.object({
  version: z
    .string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Version must follow semver (e.g., 1.0.0)"),
  instructions: z.string().min(50).max(8_000_000),
  changelog: z.string().max(5000).optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
