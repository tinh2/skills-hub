import { z } from "zod";

export const addMediaSchema = z.object({
  type: z.enum(["SCREENSHOT", "YOUTUBE"]),
  url: z.string().url(),
  caption: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const reorderMediaSchema = z.object({
  mediaIds: z.array(z.string().min(1)).min(1),
});

export type AddMediaInput = z.infer<typeof addMediaSchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;
