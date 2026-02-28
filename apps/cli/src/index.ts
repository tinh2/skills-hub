#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { searchCommand } from "./commands/search.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { updateCommand } from "./commands/update.js";

const program = new Command()
  .name("skills-hub")
  .description("CLI for skills-hub.ai — discover and install Claude Code skills")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(listCommand);
program.addCommand(updateCommand);

program.parse();
