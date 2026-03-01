import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import type { OrgInviteData } from "@skills-hub/shared";

export const orgInviteCommand = new Command("invite")
  .description("Invite a user to an organization")
  .argument("<org>", "Organization slug")
  .argument("<username>", "Username to invite")
  .option("--role <role>", "Role: admin, publisher, member", "member")
  .action(async (org: string, username: string, options) => {
    ensureAuth();

    const role = options.role.toUpperCase();
    if (!["ADMIN", "PUBLISHER", "MEMBER"].includes(role)) {
      console.error(chalk.red(`Invalid role "${options.role}". Use: admin, publisher, member`));
      process.exit(1);
    }

    const spinner = ora(`Inviting ${username}...`).start();

    try {
      const invite = await apiRequest<OrgInviteData>(`/api/v1/orgs/${org}/invites`, {
        method: "POST",
        body: JSON.stringify({ username, role }),
      });

      spinner.succeed(chalk.bold(`Invited ${username} to ${org}`));
      console.log(`  Role:    ${chalk.green(invite.role)}`);
      console.log(`  Expires: ${chalk.gray(new Date(invite.expiresAt).toLocaleDateString())}`);
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to send invite"));
      process.exit(1);
    }
  });
