import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureAuth } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import type { OrgDetail } from "@skills-hub-ai/shared";

export const orgCreateCommand = new Command("create")
  .description("Create a new organization")
  .argument("<slug>", "Organization slug (lowercase, alphanumeric with hyphens)")
  .option("--name <name>", "Organization display name")
  .option("--description <description>", "Organization description")
  .action(async (slug: string, options) => {
    ensureAuth();

    const spinner = ora("Creating organization...").start();

    try {
      const org = await apiRequest<OrgDetail>("/api/v1/orgs", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: options.name ?? slug,
          description: options.description,
        }),
      });

      spinner.succeed(chalk.bold(`Created organization ${org.name}`));
      console.log(`  Slug: ${chalk.cyan(org.slug)}`);
      console.log(`  Role: ${chalk.green("ADMIN")}`);
    } catch (err) {
      spinner.fail(chalk.red(err instanceof Error ? err.message : "Failed to create organization"));
      process.exit(1);
    }
  });
