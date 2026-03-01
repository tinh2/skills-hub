import { Command } from "commander";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { detectInstallTarget } from "../lib/install-path.js";

export const uninstallCommand = new Command("uninstall")
  .description("Remove a locally installed skill")
  .argument("<slug>", "Skill slug to uninstall")
  .action(async (slug: string) => {
    const target = detectInstallTarget();
    const skillDir = join(target.path, slug);

    if (!existsSync(skillDir)) {
      console.error(chalk.red(`Skill "${slug}" is not installed.`));
      process.exit(1);
    }

    rmSync(skillDir, { recursive: true });
    console.log(chalk.green(`Uninstalled ${slug} from ${skillDir}`));
  });
