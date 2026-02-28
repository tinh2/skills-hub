import { z } from "zod";
import { PLATFORMS } from "../constants/platforms.js";

export const recordInstallSchema = z.object({
  version: z.string().optional(),
  platform: z.enum(PLATFORMS).default("CLAUDE_CODE"),
});

export type RecordInstallInput = z.infer<typeof recordInstallSchema>;
