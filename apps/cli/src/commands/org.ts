import { Command } from "commander";
import { orgCreateCommand } from "./org-create.js";
import { orgListCommand } from "./org-list.js";
import { orgInfoCommand } from "./org-info.js";
import { orgInviteCommand } from "./org-invite.js";
import { orgRemoveCommand } from "./org-remove.js";
import { orgLeaveCommand } from "./org-leave.js";
import { orgSyncCommand } from "./org-sync.js";

export const orgCommand = new Command("org")
  .description("Manage organizations");

orgCommand.addCommand(orgCreateCommand);
orgCommand.addCommand(orgListCommand);
orgCommand.addCommand(orgInfoCommand);
orgCommand.addCommand(orgInviteCommand);
orgCommand.addCommand(orgRemoveCommand);
orgCommand.addCommand(orgLeaveCommand);
orgCommand.addCommand(orgSyncCommand);
