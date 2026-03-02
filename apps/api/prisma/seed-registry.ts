import { PrismaClient } from "@prisma/client";
import { parseSkillMd } from "@skills-hub-ai/skill-parser";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";

const prisma = new PrismaClient();

// Path to the registry repo — resolve from home directory
const REGISTRY_PATH = resolve(process.env.REGISTRY_PATH || join(process.env.HOME!, "personal/skills-hub-registry"));

const SYSTEM_USER = {
  githubId: 0,
  username: "skills-hub",
  displayName: "Skills Hub Registry",
  githubUrl: "https://github.com/tinh2/skills-hub-registry",
  bio: "Official skill registry for skills-hub.ai",
};

function discoverSkillFiles(registryPath: string): { category: string; dir: string; path: string }[] {
  const results: { category: string; dir: string; path: string }[] = [];
  const topLevel = readdirSync(registryPath);

  for (const category of topLevel) {
    const catPath = join(registryPath, category);
    if (!statSync(catPath).isDirectory() || category.startsWith(".")) continue;
    // Skip non-category dirs
    const skillMdInRoot = join(catPath, "SKILL.md");
    if (existsSync(skillMdInRoot)) continue; // This is a file, not a category dir

    const entries = readdirSync(catPath);
    for (const entry of entries) {
      const entryPath = join(catPath, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      const skillMd = join(entryPath, "SKILL.md");
      if (existsSync(skillMd)) {
        results.push({ category, dir: entry, path: skillMd });
      }
    }
  }

  return results;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function main() {
  console.log(`Registry path: ${REGISTRY_PATH}`);

  if (!existsSync(REGISTRY_PATH)) {
    console.error(`Registry not found at ${REGISTRY_PATH}`);
    console.error("Set REGISTRY_PATH env var or clone the registry to ~/personal/skills-hub-registry");
    process.exit(1);
  }

  // 1. Ensure system user exists
  const systemUser = await prisma.user.upsert({
    where: { githubId: SYSTEM_USER.githubId },
    update: { displayName: SYSTEM_USER.displayName, bio: SYSTEM_USER.bio },
    create: SYSTEM_USER,
  });
  console.log(`System user: ${systemUser.username} (${systemUser.id})`);

  // 2. Load category map
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));
  console.log(`Categories loaded: ${categoryMap.size}`);

  // 3. Discover all SKILL.md files
  const skillFiles = discoverSkillFiles(REGISTRY_PATH);
  console.log(`Discovered ${skillFiles.length} skill files`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of skillFiles) {
    const content = readFileSync(file.path, "utf-8");
    const result = parseSkillMd(content);

    if (!result.success || !result.skill) {
      console.warn(`  SKIP ${file.category}/${file.dir}: ${result.errors.map((e) => e.message).join(", ")}`);
      failed++;
      continue;
    }

    const { skill } = result;
    const slug = slugify(skill.name);
    const categoryId = categoryMap.get(skill.category || file.category);

    if (!categoryId) {
      console.warn(`  SKIP ${file.category}/${file.dir}: unknown category "${skill.category || file.category}"`);
      failed++;
      continue;
    }

    // Check if skill already exists
    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const newSkill = await tx.skill.create({
          data: {
            slug,
            name: skill.name,
            description: skill.description,
            categoryId,
            authorId: systemUser.id,
            status: "PUBLISHED",
            visibility: "PUBLIC",
            platforms: skill.platforms.length > 0 ? skill.platforms as any : ["CLAUDE_CODE"],
          },
        });

        await tx.skillVersion.create({
          data: {
            skillId: newSkill.id,
            version: skill.version || "1.0.0",
            instructions: skill.instructions,
            isLatest: true,
          },
        });
      });

      created++;
      if (created % 25 === 0) {
        console.log(`  Progress: ${created} created, ${skipped} skipped, ${failed} failed`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  FAIL ${file.category}/${file.dir}: ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (already exist), ${failed} failed`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
