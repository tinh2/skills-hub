import { FastifyInstance } from "fastify";
import { prisma } from "../../common/db.js";

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/v1/categories — list all categories
  app.get("/", async () => {
    return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  });

  // GET /api/v1/categories/:slug/skills — skills in category (redirects to search)
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const category = await prisma.category.findUnique({
      where: { slug: request.params.slug },
    });
    if (!category) return { error: { code: "CATEGORY_NOT_FOUND", message: "Category not found" } };
    return category;
  });
}
