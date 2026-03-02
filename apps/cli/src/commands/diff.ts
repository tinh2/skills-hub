import { Command } from "commander";
import chalk from "chalk";
import { apiRequest } from "../lib/api-client.js";
import type { VersionDiff } from "@skills-hub-ai/shared";

export const diffCommand = new Command("diff")
  .description("Show diff between two versions of a skill")
  .argument("<slug>", "Skill slug")
  .argument("<from>", "Source version (e.g. 1.0.0)")
  .argument("<to>", "Target version (e.g. 1.1.0)")
  .action(async (slug: string, from: string, to: string) => {
    try {
      const result = await apiRequest<VersionDiff>(
        `/api/v1/skills/${slug}/versions/${from}/diff/${to}`,
      );

      console.log(chalk.bold(`\n${slug}: v${result.fromVersion} → v${result.toVersion}\n`));

      for (const line of result.diff.split("\n")) {
        if (line.startsWith("+")) {
          console.log(chalk.green(line));
        } else if (line.startsWith("-")) {
          console.log(chalk.red(line));
        } else if (line.startsWith("@@")) {
          console.log(chalk.cyan(line));
        } else {
          console.log(line);
        }
      }
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Diff failed"));
      process.exit(1);
    }
  });
