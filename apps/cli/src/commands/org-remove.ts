import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";

export const orgRemoveCommand = new Command("remove")
  .description("Remove a member from an organization")
  .argument("<org>", "Organization slug")
  .argument("<username>", "Username to remove")
  .action(async (org: string, username: string) => {
    ensureAuth();

    const spinner = ora(`Removing ${username} from ${org}...`).start();

    try {
      // We need the user ID — look it up via org members
      const members = await apiRequest<{ data: { user: { id: string; username: string } }[] }>(
        `/api/v1/orgs/${org}/members?q=${username}&limit=1`,
      );

      const member = members.data.find((m) => m.user.username === username);
      if (!member) {
        spinner.fail(chalk.red(`User "${username}" not found in ${org}`));
        process.exit(1);
      }

      await apiRequest(`/api/v1/orgs/${org}/members/${member.user.id}`, {
        method: "DELETE",
      });

      spinner.succeed(chalk.bold(`Removed ${username} from ${org}`));
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to remove member"));
      process.exit(1);
    }
  });
