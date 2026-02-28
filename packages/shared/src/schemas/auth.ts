import { z } from "zod";

export const githubCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type GithubCallbackInput = z.infer<typeof githubCallbackSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
