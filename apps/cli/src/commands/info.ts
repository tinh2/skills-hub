import { Command } from "commander";
import chalk from "chalk";
import { apiRequest } from "../lib/api-client.js";
import type { SkillDetail } from "@skills-hub-ai/shared";

export const infoCommand = new Command("info")
  .description("Show detailed information about a skill")
  .argument("<slug>", "Skill slug")
  .option("--json", "Output as JSON")
  .action(async (slug: string, options) => {
    try {
      const skill = await apiRequest<SkillDetail>(`/api/v1/skills/${slug}`);

      if (options.json) {
        console.log(JSON.stringify(skill, null, 2));
        return;
      }

      const score = skill.qualityScore !== null
        ? chalk.green(`[${skill.qualityScore}]`)
        : chalk.gray("[--]");

      console.log(chalk.bold(`\n  ${skill.name} ${score}`));
      console.log(`  ${chalk.gray(skill.description)}`);
      console.log();
      console.log(`  Slug:       ${chalk.cyan(skill.slug)}`);
      console.log(`  Author:     ${skill.author.username}`);
      console.log(`  Category:   ${skill.category.name}`);
      console.log(`  Version:    v${skill.latestVersion}`);
      console.log(`  Visibility: ${skill.visibility}`);
      console.log(`  Status:     ${skill.status}`);
      console.log(`  Installs:   ${skill.installCount}`);
      console.log(`  Platforms:  ${skill.platforms.join(", ")}`);
      if (skill.tags.length > 0) {
        console.log(`  Tags:       ${skill.tags.join(", ")}`);
      }
      if (skill.githubRepoUrl) {
        console.log(`  GitHub:     ${chalk.cyan(skill.githubRepoUrl)}`);
      }

      if (skill.versions.length > 0) {
        console.log(chalk.bold("\n  Versions:"));
        for (const v of skill.versions) {
          const vScore = v.qualityScore !== null ? chalk.green(` [${v.qualityScore}]`) : "";
          console.log(`    v${v.version}${vScore}  ${chalk.gray(v.createdAt.slice(0, 10))}`);
          if (v.changelog) {
            console.log(`      ${chalk.gray(v.changelog)}`);
          }
        }
      }

      console.log();
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Failed to fetch skill"));
      process.exit(1);
    }
  });
