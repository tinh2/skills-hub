import { FastifyInstance } from "fastify";
import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/v1/categories — list all categories
  app.get("/", async () => {
    return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  });

  // GET /api/v1/categories/:slug — category detail
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const category = await prisma.category.findUnique({
      where: { slug: request.params.slug },
    });
    if (!category) throw new NotFoundError("Category");
    return category;
  });
}
