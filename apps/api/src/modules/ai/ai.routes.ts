import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { aiRateLimit } from "../../config/rate-limits.js";
import { generateSkill, suggestField } from "./ai.service.js";

const generateSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(2000),
});

const suggestSchema = z.object({
  field: z.enum(["name", "description", "tags"]),
  context: z.object({
    prompt: z.string().max(2000).optional(),
    name: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    instructions: z.string().max(50_000).optional(),
  }),
});

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/v1/ai/generate — generate all skill fields from a prompt
  app.post(
    "/generate",
    aiRateLimit,
    async (request) => {
      await requireAuth(request);
      const parsed = generateSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

      return generateSkill(parsed.data.prompt);
    },
  );

  // POST /api/v1/ai/suggest — suggest a single field
  app.post(
    "/suggest",
    aiRateLimit,
    async (request) => {
      await requireAuth(request);
      const parsed = suggestSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

      return suggestField(parsed.data.field, parsed.data.context);
    },
  );
}
