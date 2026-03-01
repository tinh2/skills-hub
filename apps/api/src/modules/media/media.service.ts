import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../common/errors.js";
import { requireOrgRole } from "../org/org.auth.js";
import { validateMediaUrl } from "./media.validation.js";
import type { AddMediaInput, ReorderMediaInput } from "@skills-hub/shared";

const MAX_MEDIA_PER_SKILL = 10;

async function getOwnedSkill(userId: string, slug: string) {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, authorId: true, org: { select: { slug: true } } },
  });
  if (!skill) throw new NotFoundError("Skill");
  // Allow author OR org PUBLISHER+ to manage media
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("Only the skill author can manage media");
    }
  }
  return skill;
}

export async function addMedia(userId: string, slug: string, input: AddMediaInput) {
  const skill = await getOwnedSkill(userId, slug);

  const count = await prisma.skillMedia.count({ where: { skillId: skill.id } });
  if (count >= MAX_MEDIA_PER_SKILL) {
    throw new ValidationError(`Maximum ${MAX_MEDIA_PER_SKILL} media items per skill`);
  }

  const sanitizedUrl = validateMediaUrl(input.url, input.type);

  const media = await prisma.skillMedia.create({
    data: {
      skillId: skill.id,
      type: input.type,
      url: sanitizedUrl,
      caption: input.caption ?? null,
      sortOrder: input.sortOrder,
    },
  });

  return {
    id: media.id,
    type: media.type,
    url: media.url,
    caption: media.caption,
    sortOrder: media.sortOrder,
  };
}

export async function removeMedia(userId: string, slug: string, mediaId: string) {
  const skill = await getOwnedSkill(userId, slug);

  const media = await prisma.skillMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.skillId !== skill.id) throw new NotFoundError("Media");

  await prisma.skillMedia.delete({ where: { id: mediaId } });
}

export async function reorderMedia(userId: string, slug: string, input: ReorderMediaInput) {
  const skill = await getOwnedSkill(userId, slug);

  await prisma.$transaction(
    input.mediaIds.map((id, index) =>
      prisma.skillMedia.updateMany({
        where: { id, skillId: skill.id },
        data: { sortOrder: index },
      }),
    ),
  );
}
