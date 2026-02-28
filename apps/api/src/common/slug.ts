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
  const existing = await prisma.skill.findUnique({ where: { slug } });
  if (!existing) return slug;

  for (let i = 2; i <= 100; i++) {
    const candidate = `${slug}-${i}`;
    const exists = await prisma.skill.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
  }

  // Fallback: append random suffix
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}
