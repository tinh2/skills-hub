import { prisma } from "./db.js";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);

  // Single query to find all existing slugs with this base
  const existing = await prisma.skill.findMany({
    where: {
      slug: { startsWith: slug },
    },
    select: { slug: true },
  });

  const slugSet = new Set(existing.map((e) => e.slug));
  if (!slugSet.has(slug)) return slug;

  for (let i = 2; i <= 100; i++) {
    const candidate = `${slug}-${i}`;
    if (!slugSet.has(candidate)) return candidate;
  }

  // Fallback: append random suffix
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}
