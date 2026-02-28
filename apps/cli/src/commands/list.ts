import { Command } from "commander";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { detectInstallTarget } from "../lib/install-path.js";

export const listCommand = new Command("list")
  .description("List locally installed skills")
  .alias("ls")
  .action(async () => {
    const target = detectInstallTarget();

    if (!existsSync(target.path)) {
      console.log(chalk.yellow("No skills installed."));
      return;
    }

    const dirs = readdirSync(target.path, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    if (dirs.length === 0) {
      console.log(chalk.yellow("No skills installed."));
      return;
    }

    console.log(chalk.bold(`\nInstalled skills (${target.type}):\n`));

    for (const dir of dirs) {
      const skillFile = join(target.path, dir.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      try {
        const content = readFileSync(skillFile, "utf-8");
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const versionMatch = content.match(/^version:\s*(.+)$/m);
        const name = nameMatch?.[1] || dir.name;
        const version = versionMatch?.[1] || "unknown";

        console.log(`  ${chalk.bold(name)} ${chalk.gray(`v${version}`)} ${chalk.cyan(`/${dir.name}`)}`);
      } catch {
        console.log(`  ${chalk.bold(dir.name)} ${chalk.gray("(unable to read)")}`);
      }
    }

    console.log();
  });
