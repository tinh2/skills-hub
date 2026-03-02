import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { parseSkillMd, type ParsedSkill } from "@skills-hub-ai/skill-parser";

export function readAndParseSkillMd(path: string): ParsedSkill {
  const resolved = resolve(path);

  let content: string;
  try {
    content = readFileSync(resolved, "utf-8");
  } catch {
    console.error(chalk.red(`Could not read file: ${resolved}`));
    process.exit(1);
  }

  const result = parseSkillMd(content);

  if (!result.success) {
    console.error(chalk.red("Invalid SKILL.md:"));
    for (const err of result.errors) {
      console.error(chalk.red(`  ${err.field}: ${err.message}`));
    }
    process.exit(1);
  }

  return result.skill!;
}
