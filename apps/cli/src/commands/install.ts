import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../lib/api-client.js";
import { detectInstallTarget } from "../lib/install-path.js";
import type { SkillDetail } from "@skills-hub/shared";

/** Escape a string for safe inclusion in YAML frontmatter values */
function yamlEscape(value: string): string {
  if (/[:\-#{}\[\]&*!|>'"%@`]/.test(value) || value.includes("\n")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Core install logic — reusable from update command */
export async function installSkill(slug: string, options: { version?: string; target?: string; team?: string }) {
  const endpoint = options.team
    ? `/api/v1/orgs/${options.team}/skills/${slug}`
    : `/api/v1/skills/${slug}`;
  const skill = await apiRequest<SkillDetail>(endpoint);

  let instructions = skill.instructions;
  let version = skill.latestVersion;

  if (options.version) {
    const ver = await apiRequest<{ instructions: string; version: string }>(
      `/api/v1/skills/${slug}/versions/${options.version}`,
    );
    instructions = ver.instructions;
    version = ver.version;
  }

  const target = detectInstallTarget();
  const skillDir = join(
    options.target === "cursor"
      ? join(homedir(), ".cursor", "skills")
      : target.path,
    slug,
  );

  mkdirSync(skillDir, { recursive: true });

  const skillContent = `---
name: ${yamlEscape(skill.name)}
description: ${yamlEscape(skill.description)}
version: ${version}
category: ${skill.category.slug}
---

${instructions}
`;

  writeFileSync(join(skillDir, "SKILL.md"), skillContent);

  // Record install — don't fail if tracking fails
  await apiRequest(`/api/v1/skills/${slug}/install`, {
    method: "POST",
    body: JSON.stringify({ version, platform: target.type === "cursor" ? "CURSOR" : "CLAUDE_CODE" }),
  }).catch(() => {});

  return { skill, version, skillDir };
}

interface ChildResult {
  slug: string;
  status: "installed" | "skipped" | "failed";
  error?: string;
}

/** Install a skill and all its composition dependencies recursively */
export async function installWithDependencies(
  slug: string,
  options: { version?: string; target?: string; team?: string },
  callbacks: {
    onChildStart?: (slug: string, index: number, total: number) => void;
    onChildSkip?: (slug: string) => void;
    onChildDone?: (slug: string) => void;
    onChildFail?: (slug: string, error: string) => void;
  } = {},
) {
  const parent = await installSkill(slug, options);

  const children: ChildResult[] = [];
  if (!parent.skill.composition?.children.length) {
    return { parent, children };
  }

  // Recursively collect all child slugs (BFS with cycle protection)
  const visited = new Set<string>([slug]);
  const toInstall: string[] = [];

  async function collectChildren(detail: SkillDetail, depth: number) {
    if (depth > 5 || !detail.composition?.children.length) return;
    for (const child of detail.composition.children) {
      if (visited.has(child.skill.slug)) continue;
      visited.add(child.skill.slug);
      toInstall.push(child.skill.slug);
      // Check if this child is itself a composition — if fetch fails, skip recursion
      try {
        const childDetail = await apiRequest<SkillDetail>(`/api/v1/skills/${child.skill.slug}`);
        await collectChildren(childDetail, depth + 1);
      } catch {
        // Child will still be attempted during the install loop
      }
    }
  }

  await collectChildren(parent.skill, 0);

  // Determine install target path for "already installed" checks
  const target = detectInstallTarget();
  const targetPath = options.target === "cursor"
    ? join(homedir(), ".cursor", "skills")
    : target.path;

  for (let i = 0; i < toInstall.length; i++) {
    const childSlug = toInstall[i];

    if (existsSync(join(targetPath, childSlug, "SKILL.md"))) {
      callbacks.onChildSkip?.(childSlug);
      children.push({ slug: childSlug, status: "skipped" });
      continue;
    }

    callbacks.onChildStart?.(childSlug, i, toInstall.length);

    try {
      await installSkill(childSlug, { target: options.target });
      callbacks.onChildDone?.(childSlug);
      children.push({ slug: childSlug, status: "installed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      callbacks.onChildFail?.(childSlug, msg);
      children.push({ slug: childSlug, status: "failed", error: msg });
    }
  }

  return { parent, children };
}

export const installCommand = new Command("install")
  .description("Install a skill from skills-hub.ai")
  .argument("<slug>", "Skill slug or name")
  .option("-v, --version <version>", "Install a specific version")
  .option("-t, --target <target>", "Install target: claude-code, cursor")
  .option("--team <org-slug>", "Install from an organization")
  .option("--no-deps", "Skip installing composition dependencies")
  .action(async (slug: string, options) => {
    const spinner = ora(`Installing ${slug}...`).start();

    try {
      if (options.deps === false) {
        const { skill, version, skillDir } = await installSkill(slug, options);
        spinner.succeed(
          `${chalk.bold(skill.name)} v${version} installed to ${chalk.cyan(skillDir)}`,
        );
        console.log(`  Use: ${chalk.yellow(`/${slug}`)} in Claude Code`);
        return;
      }

      const { parent, children } = await installWithDependencies(slug, options, {
        onChildStart: (childSlug, index, total) => {
          spinner.text = `Installing dependency ${index + 1}/${total}: ${childSlug}...`;
        },
        onChildSkip: (childSlug) => {
          spinner.info(`  ${childSlug} already installed, skipping`);
          spinner.start();
        },
        onChildFail: (childSlug, error) => {
          spinner.warn(`  ${childSlug} failed: ${error}`);
          spinner.start();
        },
      });

      spinner.succeed(
        `${chalk.bold(parent.skill.name)} v${parent.version} installed to ${chalk.cyan(parent.skillDir)}`,
      );

      if (children.length > 0) {
        const installed = children.filter((c) => c.status === "installed").length;
        const skipped = children.filter((c) => c.status === "skipped").length;
        const failed = children.filter((c) => c.status === "failed").length;
        const parts: string[] = [];
        if (installed > 0) parts.push(`${installed} installed`);
        if (skipped > 0) parts.push(`${skipped} already installed`);
        if (failed > 0) parts.push(chalk.yellow(`${failed} failed`));
        console.log(`  Dependencies: ${parts.join(", ")}`);
      }

      console.log(`  Use: ${chalk.yellow(`/${slug}`)} in Claude Code`);

      if (children.some((c) => c.status === "failed")) {
        process.exitCode = 1;
      }
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Install failed"));
      process.exit(1);
    }
  });
