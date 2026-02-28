import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";
import type { RecordInstallInput } from "@skills-hub/shared";

export async function recordInstall(
  slug: string,
  input: RecordInstallInput,
  userId: string | null,
): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    include: {
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
