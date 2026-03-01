import { z } from "zod";
import { PLATFORMS } from "../constants/platforms.js";

export const recordInstallSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (e.g., 1.0.0)").optional(),
  platform: z.enum(PLATFORMS).default("CLAUDE_CODE"),
});

export type RecordInstallInput = z.infer<typeof recordInstallSchema>;
