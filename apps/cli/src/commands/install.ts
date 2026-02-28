import { Command } from "commander";
import { mkdirSync, writeFileSync } from "node:fs";
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
export async function installSkill(slug: string, options: { version?: string; target?: string }) {
  const skill = await apiRequest<SkillDetail>(`/api/v1/skills/${slug}`);

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

export const installCommand = new Command("install")
  .description("Install a skill from skills-hub.ai")
  .argument("<slug>", "Skill slug or name")
  .option("-v, --version <version>", "Install a specific version")
  .option("-t, --target <target>", "Install target: claude-code, cursor")
  .action(async (slug: string, options) => {
    const spinner = ora(`Installing ${slug}...`).start();

    try {
      const { skill, version, skillDir } = await installSkill(slug, options);

      spinner.succeed(
        `${chalk.bold(skill.name)} v${version} installed to ${chalk.cyan(skillDir)}`,
      );
      console.log(
        `  Use: ${chalk.yellow(`/${slug}`)} in Claude Code`,
      );
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Install failed"));
      process.exit(1);
    }
  });
