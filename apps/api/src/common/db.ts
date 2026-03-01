import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasourceUrl: appendPoolParams(process.env.DATABASE_URL ?? ""),
});

/** Append connection pool params if not already set in the URL */
function appendPoolParams(url: string): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  if (!url.includes("connection_limit")) params.push("connection_limit=20");
  if (!url.includes("pool_timeout")) params.push("pool_timeout=10");
  return params.length > 0 ? `${url}${sep}${params.join("&")}` : url;
}

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
