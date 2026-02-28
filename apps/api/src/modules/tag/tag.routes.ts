import { FastifyInstance } from "fastify";
import { prisma } from "../../common/db.js";

export async function tagRoutes(app: FastifyInstance) {
  // GET /api/v1/tags?q= — list/search tags for autocomplete
  app.get<{ Querystring: { q?: string; limit?: string } }>("/", async (request) => {
    const { q, limit } = request.query;
    const take = Math.min(Number(limit) || 20, 50);

    const where = q
      ? { name: { contains: q.toLowerCase(), mode: "insensitive" as const } }
      : {};

    return prisma.tag.findMany({
      where,
      take,
      orderBy: { name: "asc" },
      include: { _count: { select: { skills: true } } },
    });
  });
}
