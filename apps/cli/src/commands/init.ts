import { Command } from "commander";
import { existsSync, readdirSync } from "node:fs";
import chalk from "chalk";
import { getConfig } from "../lib/config.js";
import { detectInstallTarget } from "../lib/install-path.js";
import { apiRequest } from "../lib/api-client.js";

interface SearchResult {
  data: Array<{ slug: string; name: string; description: string }>;
}

export const initCommand = new Command("init")
  .description("Get started with skills-hub — shows setup status and next steps")
  .action(async () => {
    console.log("");
    console.log(chalk.bold("  Welcome to skills-hub.ai"));
    console.log(chalk.dim("  The open platform for AI coding skills"));
    console.log("");

    // 1. Detect platform
    const target = detectInstallTarget();
    const platform = target.type === "cursor" ? "Cursor" : "Claude Code";
    console.log(`  ${chalk.green("Platform:")} ${platform}`);
    console.log(`  ${chalk.green("Skills directory:")} ${target.path}`);
    console.log("");

    // 2. Check auth
    const config = getConfig();
    const hasAuth = !!(config.apiKey || config.accessToken);
    if (hasAuth) {
      console.log(`  ${chalk.green("Authenticated:")} Yes`);
    } else {
      console.log(`  ${chalk.yellow("Authenticated:")} No`);
      console.log(`  Run ${chalk.cyan("skills-hub login")} to sign in with GitHub`);
    }
    console.log("");

    // 3. Count installed skills
    if (existsSync(target.path)) {
      const dirs = readdirSync(target.path, { withFileTypes: true })
        .filter((d) => d.isDirectory());
      if (dirs.length > 0) {
        console.log(`  ${chalk.green("Installed skills:")} ${dirs.length}`);
        console.log(`  Run ${chalk.cyan("skills-hub list")} to see them`);
      } else {
        console.log(`  ${chalk.dim("No skills installed yet.")}`);
      }
    } else {
      console.log(`  ${chalk.dim("No skills installed yet.")}`);
    }
    console.log("");

    // 4. Suggest popular skills
    try {
      const result = await apiRequest<SearchResult>(
        "/api/v1/search?sort=most_installed&limit=5",
      );
      if (result.data.length > 0) {
        console.log("  Popular skills:");
        for (const skill of result.data) {
          console.log(`    ${chalk.bold(skill.name)} ${chalk.dim(`(${skill.slug})`)}`);
          console.log(`    ${chalk.dim(skill.description)}`);
        }
        console.log("");
        console.log(`  Install one: ${chalk.cyan("skills-hub install <slug>")}`);
        console.log("");
      }
    } catch {
      // Offline or API unavailable — skip suggestions
    }

    // 5. MCP server setup
    console.log("  Use skills in any AI tool with MCP:");
    if (target.type === "cursor") {
      console.log(`  Add to ${chalk.cyan(".cursor/mcp.json")}:`);
      console.log(chalk.dim('  { "mcpServers": { "skills-hub": { "command": "npx", "args": ["@skills-hub-ai/mcp"] } } }'));
    } else {
      console.log(`  ${chalk.cyan('claude mcp add skills-hub -- npx @skills-hub-ai/mcp')}`);
    }
    console.log("");

    // 6. Next steps
    console.log("  Next steps:");
    console.log(`    ${chalk.cyan("skills-hub search <query>")}    Search for skills`);
    console.log(`    ${chalk.cyan("skills-hub install <slug>")}    Install a skill`);
    console.log(`    ${chalk.cyan("skills-hub publish")}            Publish your own`);
    console.log(`    ${chalk.dim("https://skills-hub.ai/docs/cli")}  Full CLI reference`);
    console.log("");
  });
