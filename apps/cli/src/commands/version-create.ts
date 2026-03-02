import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import { readAndParseSkillMd } from "../lib/skill-file.js";
import type { VersionSummary } from "@skills-hub-ai/shared";

export const versionCreateCommand = new Command("version")
  .description("Create a new version of a published skill")
  .argument("<slug>", "Skill slug")
  .argument("[path]", "Path to updated SKILL.md", "./SKILL.md")
  .option("--changelog <text>", "Changelog for this version")
  .action(async (slug: string, path: string, options) => {
    ensureAuth();

    const skill = readAndParseSkillMd(path);

    const spinner = ora(`Creating version for ${slug}...`).start();

    try {
      const version = await apiRequest<VersionSummary>(
        `/api/v1/skills/${slug}/versions`,
        {
          method: "POST",
          body: JSON.stringify({
            version: skill.version,
            instructions: skill.instructions,
            changelog: options.changelog || null,
          }),
        },
      );

      spinner.succeed(chalk.bold(`Version v${version.version} created for ${slug}`));
      if (version.changelog) {
        console.log(`  Changelog: ${chalk.gray(version.changelog)}`);
      }
      if (version.qualityScore !== null) {
        console.log(`  Score:     ${chalk.green(version.qualityScore)}`);
      }
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Version creation failed"));
      process.exit(1);
    }
  });
