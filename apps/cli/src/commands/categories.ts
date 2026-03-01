import { Command } from "commander";
import chalk from "chalk";
import { CATEGORIES } from "@skills-hub/shared";

export const categoriesCommand = new Command("categories")
  .description("List all skill categories")
  .action(async () => {
    console.log(chalk.bold("\nCategories:\n"));

    const maxSlug = Math.max(...CATEGORIES.map((c) => c.slug.length));

    for (const cat of CATEGORIES) {
      console.log(`  ${chalk.cyan(cat.slug.padEnd(maxSlug))}  ${chalk.gray(cat.description)}`);
    }

    console.log();
  });
