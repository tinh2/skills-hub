import { FastifyInstance } from "fastify";
import { requireAuth } from "../../common/auth.js";
import * as orgService from "./org.service.js";

export async function inviteRoutes(app: FastifyInstance) {
  // POST /api/v1/invites/:token/accept — accept invite
  app.post<{ Params: { token: string } }>("/:token/accept", async (request) => {
    const { userId } = await requireAuth(request);
    await orgService.acceptInvite(userId, request.params.token);
    return { success: true };
  });

  // POST /api/v1/invites/:token/decline — decline invite
  app.post<{ Params: { token: string } }>("/:token/decline", async (request) => {
    const { userId } = await requireAuth(request);
    await orgService.declineInvite(userId, request.params.token);
    return { success: true };
  });
}
