import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";
import type { RecordInstallInput } from "@skills-hub-ai/shared";

// Simple in-memory dedup for anonymous installs (IP + skill slug hash)
const anonDedup = new Map<string, number>();
const ANON_DEDUP_TTL = 24 * 60 * 60 * 1000; // 24 hours
const ANON_DEDUP_MAX = 10_000; // max entries to prevent unbounded growth

function checkAnonDedup(skillId: string, ip: string): boolean {
  const key = createHash("sha256").update(`${ip}:${skillId}`).digest("hex").slice(0, 16);
  const now = Date.now();

  // Evict expired entries periodically
  if (anonDedup.size > ANON_DEDUP_MAX) {
    for (const [k, ts] of anonDedup) {
      if (now - ts > ANON_DEDUP_TTL) anonDedup.delete(k);
    }
  }

  if (anonDedup.has(key)) return true; // already seen
  anonDedup.set(key, now);
  return false;
}

export async function recordInstall(
  slug: string,
  input: RecordInstallInput,
  userId: string | null,
  ip?: string,
): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: {
      id: true,
      versions: { where: { isLatest: true }, select: { version: true }, take: 1 },
    },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Deduplicate: authenticated users can only install once per skill
  if (userId) {
    const existing = await prisma.install.findUnique({
      where: { skillId_userId: { skillId: skill.id, userId } },
    });
    if (existing) return;
  } else if (ip) {
    // Anonymous: IP-based dedup to prevent counter inflation
    if (checkAnonDedup(skill.id, ip)) return;
  }

  const version = input.version ?? skill.versions[0]?.version ?? "0.0.0";

  try {
    await prisma.$transaction([
      prisma.install.create({
        data: {
          skillId: skill.id,
          userId,
          version,
          platform: input.platform as any,
        },
      }),
      prisma.skill.update({
        where: { id: skill.id },
        data: { installCount: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // Race condition: unique constraint violation — another request beat us
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return;
    }
    throw e;
  }
}

export async function getInstallCount(slug: string): Promise<number> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { installCount: true },
  });
  if (!skill) throw new NotFoundError("Skill");
  return skill.installCount;
}
