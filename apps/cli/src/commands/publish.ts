import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import { readAndParseSkillMd } from "../lib/skill-file.js";
import type { SkillDetail, Visibility } from "@skills-hub/shared";

export const publishCommand = new Command("publish")
  .description("Publish a skill from a SKILL.md file")
  .argument("[path]", "Path to SKILL.md", "./SKILL.md")
  .option("--draft", "Create as draft without publishing")
  .option("--visibility <visibility>", "Visibility: public, private, unlisted, org", "public")
  .option("--org <org-slug>", "Publish to an organization")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--github-repo <url>", "GitHub repository URL")
  .action(async (path: string, options) => {
    ensureAuth();

    const skill = readAndParseSkillMd(path);

    if (!skill.category) {
      console.error(chalk.red("SKILL.md must include a category field."));
      process.exit(1);
    }

    let visibility = options.visibility.toUpperCase() as Visibility;
    if (!["PUBLIC", "PRIVATE", "UNLISTED", "ORG"].includes(visibility)) {
      console.error(chalk.red(`Invalid visibility "${options.visibility}". Use: public, private, unlisted, org`));
      process.exit(1);
    }

    // Default to ORG visibility when --org is set
    if (options.org && visibility === "PUBLIC") {
      visibility = "ORG" as Visibility;
    }

    const platforms = skill.platforms.length > 0 ? skill.platforms : ["CLAUDE_CODE"];
    const tags = options.tags ? options.tags.split(",").map((t: string) => t.trim()) : [];

    const spinner = ora("Publishing skill...").start();

    try {
      const created = await apiRequest<SkillDetail>("/api/v1/skills", {
        method: "POST",
        body: JSON.stringify({
          name: skill.name,
          description: skill.description,
          version: skill.version,
          categorySlug: skill.category,
          platforms,
          instructions: skill.instructions,
          visibility,
          tags,
          githubRepoUrl: options.githubRepo || null,
          orgSlug: options.org || undefined,
        }),
      });

      if (!options.draft) {
        await apiRequest(`/api/v1/skills/${created.slug}/publish`, {
          method: "POST",
        });
      }

      spinner.succeed(chalk.bold(`Published ${created.name}`));
      console.log(`  Slug:       ${chalk.cyan(created.slug)}`);
      console.log(`  Version:    ${chalk.gray(`v${created.latestVersion}`)}`);
      console.log(`  Visibility: ${chalk.gray(visibility)}`);
      if (created.qualityScore !== null) {
        console.log(`  Score:      ${chalk.green(created.qualityScore)}`);
      }
      console.log(`  Status:     ${options.draft ? chalk.yellow("DRAFT") : chalk.green("PUBLISHED")}`);
      console.log(`  URL:        ${chalk.cyan(`https://skills-hub.ai/skills/${created.slug}`)}`);
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Publish failed"));
      process.exit(1);
    }
  });
