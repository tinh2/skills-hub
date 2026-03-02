#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { searchCommand } from "./commands/search.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { updateCommand } from "./commands/update.js";
import { publishCommand } from "./commands/publish.js";
import { versionCreateCommand } from "./commands/version-create.js";
import { logoutCommand } from "./commands/logout.js";
import { whoamiCommand } from "./commands/whoami.js";
import { infoCommand } from "./commands/info.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { categoriesCommand } from "./commands/categories.js";
import { diffCommand } from "./commands/diff.js";
import { unpublishCommand } from "./commands/unpublish.js";
import { orgCommand } from "./commands/org.js";
import { initCommand } from "./commands/init.js";

const program = new Command()
  .name("skills-hub")
  .description("CLI for skills-hub.ai — discover and install Claude Code skills")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(uninstallCommand);
program.addCommand(listCommand);
program.addCommand(updateCommand);
program.addCommand(publishCommand);
program.addCommand(versionCreateCommand);
program.addCommand(infoCommand);
program.addCommand(categoriesCommand);
program.addCommand(diffCommand);
program.addCommand(unpublishCommand);
program.addCommand(orgCommand);
program.addCommand(initCommand);

program.parse();
