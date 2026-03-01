import { FastifyInstance } from "fastify";
import * as categoryService from "./category.service.js";

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/v1/categories — list all categories
  app.get("/", async () => {
    return categoryService.listCategories();
  });

  // GET /api/v1/categories/featured — featured skill per category
  app.get("/featured", async () => {
    return categoryService.getFeaturedSkillPerCategory();
  });

  // GET /api/v1/categories/:slug — category detail
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    return categoryService.getCategoryBySlug(request.params.slug);
  });
}
