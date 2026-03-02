import { Command } from "commander";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { apiRequest } from "../lib/api-client.js";
import { detectInstallTarget } from "../lib/install-path.js";
import { compareSemver } from "@skills-hub-ai/skill-parser";
import { installSkill } from "./install.js";
import type { SkillDetail } from "@skills-hub-ai/shared";

export const updateCommand = new Command("update")
  .description("Update installed skills to latest versions")
  .argument("[slug]", "Update a specific skill (or all if omitted)")
  .action(async (slug?: string) => {
    const target = detectInstallTarget();

    if (!existsSync(target.path)) {
      console.log(chalk.yellow("No skills installed."));
      return;
    }

    const dirs = slug
      ? [slug]
      : readdirSync(target.path, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);

    let updated = 0;

    for (const dirName of dirs) {
      const skillFile = join(target.path, dirName, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      const content = readFileSync(skillFile, "utf-8");
      const versionMatch = content.match(/^version:\s*(.+)$/m);
      const localVersion = versionMatch?.[1]?.trim() || "0.0.0";

      const spinner = ora(`Checking ${dirName}...`).start();

      try {
        const remote = await apiRequest<SkillDetail>(`/api/v1/skills/${dirName}`);

        if (compareSemver(remote.latestVersion, localVersion) > 0) {
          spinner.text = `Updating ${dirName} ${localVersion} -> ${remote.latestVersion}...`;
          await installSkill(dirName, {});
          spinner.succeed(`${chalk.bold(dirName)} updated to v${remote.latestVersion}`);
          updated++;
        } else {
          spinner.info(`${chalk.bold(dirName)} is up to date (v${localVersion})`);
        }
      } catch {
        spinner.warn(`${chalk.bold(dirName)}: could not check for updates`);
      }
    }

    if (updated === 0) {
      console.log(chalk.green("\nAll skills are up to date."));
    } else {
      console.log(chalk.green(`\n${updated} skill(s) updated.`));
    }
  });
