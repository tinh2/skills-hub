import { Command } from "commander";
import chalk from "chalk";
import { getConfig, saveConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api-client.js";

export const logoutCommand = new Command("logout")
  .description("Log out and clear saved credentials")
  .action(async () => {
    const config = getConfig();

    if (!config.apiKey && !config.accessToken) {
      console.log(chalk.yellow("Not logged in."));
      return;
    }

    // Best-effort server-side session revocation
    if (config.accessToken) {
      await apiRequest("/api/v1/auth/session", { method: "DELETE" }).catch(() => {});
    }

    saveConfig({ accessToken: undefined, apiKey: undefined });
    console.log(chalk.green("Logged out."));
  });
