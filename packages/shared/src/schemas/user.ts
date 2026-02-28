import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
