import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";

export const orgSyncCommand = new Command("sync")
  .description("Sync organization members with a GitHub organization")
  .argument("<org>", "Organization slug")
  .option("--github-org <slug>", "GitHub organization slug to connect")
  .option("--default-role <role>", "Default role for synced members", "member")
  .action(async (org: string, options) => {
    ensureAuth();

    if (options.githubOrg) {
      // Connect a GitHub org
      const spinner = ora(`Connecting GitHub org ${options.githubOrg}...`).start();

      try {
        const result = await apiRequest<{ connected: boolean; membersAdded: number }>(
          `/api/v1/orgs/${org}/github`,
          {
            method: "POST",
            body: JSON.stringify({
              githubOrgSlug: options.githubOrg,
              defaultRole: options.defaultRole.toUpperCase(),
            }),
          },
        );

        spinner.succeed(
          chalk.bold(`Connected to GitHub org ${options.githubOrg} — ${result.membersAdded} members added`),
        );
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to connect GitHub org"));
        process.exit(1);
      }
    } else {
      // Manual sync
      const spinner = ora(`Syncing members for ${org}...`).start();

      try {
        const result = await apiRequest<{ synced: number; added: number }>(
          `/api/v1/orgs/${org}/github/sync`,
          { method: "POST" },
        );

        spinner.succeed(
          chalk.bold(`Synced ${result.synced} GitHub members — ${result.added} new members added`),
        );
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to sync members"));
        process.exit(1);
      }
    }
  });
