import { Command } from "commander";
import chalk from "chalk";
import { ensureAuth, getConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";
import type { PrivateUser } from "@skills-hub-ai/shared";

export const whoamiCommand = new Command("whoami")
  .description("Show current authenticated user")
  .action(async () => {
    ensureAuth();

    try {
      const user = await apiRequest<PrivateUser>("/api/v1/users/me");
      const config = getConfig();
      const authMethod = config.apiKey ? "API key" : "OAuth";

      console.log(chalk.bold(`\n  ${user.username}`));
      console.log(`  Auth:      ${chalk.gray(authMethod)}`);
      console.log(`  API:       ${chalk.gray(config.apiUrl)}`);
      console.log(`  Skills:    ${chalk.cyan(String(user.skillCount))}`);
      console.log(`  Installs:  ${chalk.cyan(String(user.totalInstalls))}`);
      console.log();
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Failed to fetch user"));
      process.exit(1);
    }
  });
