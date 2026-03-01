import { Command } from "commander";
import chalk from "chalk";
import { apiRequest } from "../lib/api-client.js";
import type { PaginatedResponse, SkillSummary } from "@skills-hub/shared";

export const searchCommand = new Command("search")
  .description("Search for skills")
  .argument("<query>", "Search query")
  .option("-c, --category <category>", "Filter by category")
  .option("-s, --sort <sort>", "Sort by: newest, most_installed, highest_rated", "most_installed")
  .option("-l, --limit <n>", "Number of results", "10")
  .option("--org <org-slug>", "Search within an organization")
  .action(async (query: string, options) => {
    try {
      const params = new URLSearchParams({
        q: query,
        sort: options.sort,
        limit: options.limit,
      });
      if (options.category) params.set("category", options.category);
      if (options.org) params.set("org", options.org);

      const result = await apiRequest<PaginatedResponse<SkillSummary>>(
        `/api/v1/search?${params}`,
      );

      if (result.data.length === 0) {
        console.log(chalk.yellow("No skills found."));
        return;
      }

      console.log(chalk.bold(`\nFound ${result.data.length} skills:\n`));

      for (const skill of result.data) {
        const score = skill.qualityScore !== null
          ? chalk.green(`[${skill.qualityScore}]`)
          : chalk.gray("[--]");

        console.log(
          `  ${score} ${chalk.bold(skill.name)} ${chalk.gray(`v${skill.latestVersion}`)}`,
        );
        console.log(
          `     ${chalk.gray(skill.description.slice(0, 80))}`,
        );
        console.log(
          `     ${chalk.cyan(`npx skills-hub install ${skill.slug}`)}  ${chalk.gray(`${skill.installCount} installs`)}`,
        );
        console.log();
      }
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Search failed"));
      process.exit(1);
    }
  });
