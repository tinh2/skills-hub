import { FastifyInstance } from "fastify";
import { updateProfileSchema, createApiKeySchema } from "@skills-hub/shared";
import { requireAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import * as userService from "./user.service.js";

export async function userRoutes(app: FastifyInstance) {
  // GET /api/v1/users/:username — public profile
  app.get<{ Params: { username: string } }>("/:username", async (request) => {
    return userService.getPublicProfile(request.params.username);
  });

  // GET /api/v1/users/me — private profile (auth required)
  app.get("/me", async (request) => {
    const { userId } = await requireAuth(request);
    return userService.getPrivateProfile(userId);
  });

  // PATCH /api/v1/users/me — update profile (auth required)
  app.patch("/me", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return userService.updateProfile(userId, parsed.data);
  });

  // POST /api/v1/users/me/api-keys — create API key
  app.post("/me/api-keys", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createApiKeySchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return userService.createApiKey(userId, parsed.data.name, parsed.data.expiresInDays);
  });

  // GET /api/v1/users/me/api-keys — list API keys
  app.get("/me/api-keys", async (request) => {
    const { userId } = await requireAuth(request);
    return userService.listApiKeys(userId);
  });

  // DELETE /api/v1/users/me/api-keys/:id — revoke API key
  app.delete<{ Params: { id: string } }>("/me/api-keys/:id", async (request) => {
    const { userId } = await requireAuth(request);
    await userService.deleteApiKey(userId, request.params.id);
    return { success: true };
  });
}
