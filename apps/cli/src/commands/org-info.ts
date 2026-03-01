import { Command } from "commander";
import chalk from "chalk";
import { apiRequest } from "../lib/api-client.js";
import type { OrgDetail, OrgMember, PaginatedResponse } from "@skills-hub/shared";

export const orgInfoCommand = new Command("info")
  .description("Show organization details")
  .argument("<slug>", "Organization slug")
  .option("--json", "Output as JSON")
  .option("--members", "Show members list")
  .action(async (slug: string, options) => {
    try {
      const org = await apiRequest<OrgDetail>(`/api/v1/orgs/${slug}`);

      if (options.json) {
        console.log(JSON.stringify(org, null, 2));
        return;
      }

      console.log(chalk.bold(`\n${org.name}`));
      if (org.description) console.log(`  ${chalk.gray(org.description)}`);
      console.log();
      console.log(`  Slug:        ${chalk.cyan(org.slug)}`);
      console.log(`  Members:     ${org.memberCount}`);
      console.log(`  Skills:      ${org.skillCount}`);
      console.log(`  Installs:    ${org.totalInstalls}`);
      if (org.githubOrg) {
        console.log(`  GitHub:      ${chalk.cyan(org.githubOrg)}`);
      }
      if (org.currentUserRole) {
        console.log(`  Your role:   ${chalk.green(org.currentUserRole)}`);
      }

      if (options.members) {
        console.log(chalk.bold("\n  Members:\n"));
        const result = await apiRequest<PaginatedResponse<OrgMember>>(
          `/api/v1/orgs/${slug}/members?limit=50`,
        );
        for (const member of result.data) {
          const roleColor = member.role === "ADMIN" ? chalk.red : member.role === "PUBLISHER" ? chalk.yellow : chalk.gray;
          console.log(`    ${chalk.bold(member.user.username)} ${roleColor(member.role)}`);
        }
      }
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : "Failed to get organization"));
      process.exit(1);
    }
  });
