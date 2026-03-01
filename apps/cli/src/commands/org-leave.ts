import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";

export const orgLeaveCommand = new Command("leave")
  .description("Leave an organization")
  .argument("<org>", "Organization slug")
  .action(async (org: string) => {
    ensureAuth();

    const spinner = ora(`Leaving ${org}...`).start();

    try {
      // Get current user info
      const me = await apiRequest<{ id: string }>("/api/v1/users/me");

      await apiRequest(`/api/v1/orgs/${org}/members/${me.id}`, {
        method: "DELETE",
      });

      spinner.succeed(chalk.bold(`Left organization ${org}`));
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to leave organization"));
      process.exit(1);
    }
  });
