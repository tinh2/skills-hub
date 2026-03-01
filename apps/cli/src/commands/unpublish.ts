import { Command } from "commander";
import chalk from "chalk";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";

export const unpublishCommand = new Command("unpublish")
  .description("Archive a published skill")
  .argument("<slug>", "Skill slug to unpublish")
  .action(async (slug: string) => {
    ensureAuth();

    try {
      await apiRequest(`/api/v1/skills/${slug}`, { method: "DELETE" });
      console.log(chalk.green(`Skill "${slug}" has been archived.`));
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Unpublish failed"));
      process.exit(1);
    }
  });
