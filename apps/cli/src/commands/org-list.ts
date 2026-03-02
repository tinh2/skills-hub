import { Command } from "commander";
import chalk from "chalk";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import type { UserOrgMembership } from "@skills-hub-ai/shared";

export const orgListCommand = new Command("list")
  .alias("ls")
  .description("List your organizations")
  .action(async () => {
    ensureAuth();

    try {
      const orgs = await apiRequest<UserOrgMembership[]>("/api/v1/orgs");

      if (orgs.length === 0) {
        console.log(chalk.yellow("You are not a member of any organizations."));
        console.log(`  Create one: ${chalk.cyan("skills-hub org create <slug>")}`);
        return;
      }

      console.log(chalk.bold(`\nYour organizations (${orgs.length}):\n`));

      for (const m of orgs) {
        const roleColor = m.role === "ADMIN" ? chalk.red : m.role === "PUBLISHER" ? chalk.yellow : chalk.gray;
        console.log(`  ${chalk.bold(m.org.name)} ${chalk.gray(`(${m.org.slug})`)}`);
        console.log(`    Role: ${roleColor(m.role)}`);
      }
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Failed to list organizations"));
      process.exit(1);
    }
  });
