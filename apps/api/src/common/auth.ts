import { FastifyRequest } from "fastify";
import * as jose from "jose";
import { prisma } from "./db.js";
import { UnauthorizedError } from "./errors.js";
import { getEnv } from "../config/env.js";

interface JwtPayload {
  sub: string;
  username: string;
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export async function createAccessToken(userId: string, username: string): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new jose.SignJWT({ sub: userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function createRefreshToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function requireAuth(request: FastifyRequest): Promise<{ userId: string; username: string }> {
  const authHeader = request.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    return { userId: payload.sub, username: payload.username };
  }

  // Check for API key auth
  if (authHeader?.startsWith("ApiKey ")) {
    const key = authHeader.slice(7);
    const hash = await hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { user: { select: { id: true, username: true } } },
    });

    if (!apiKey) throw new UnauthorizedError("Invalid API key");
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedError("API key expired");
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: apiKey.user.id, username: apiKey.user.username };
  }

  throw new UnauthorizedError();
}

export async function optionalAuth(
  request: FastifyRequest,
): Promise<{ userId: string; username: string } | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const hashToken = hashApiKey;
