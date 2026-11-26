import type { Command } from "commander";
import * as chatSubcommand from "#src/commands/projects/chat.js";
import * as groupsSubcommand from "#src/commands/projects/groups.js";
import * as joinSubcommand from "#src/commands/projects/join.js";
import * as lsSubcommand from "#src/commands/projects/ls.js";
import * as quitSubcommand from "#src/commands/projects/quit.js";
import * as showSubcommand from "#src/commands/projects/show.js";
import * as stepsSubcommand from "#src/commands/projects/steps.js";

export function register(program: Command) {
  const command = program.command("projects").description("manage projects");

  chatSubcommand.register(command);
  groupsSubcommand.register(command);
  joinSubcommand.register(command);
  lsSubcommand.register(command);
  quitSubcommand.register(command);
  showSubcommand.register(command);
  stepsSubcommand.register(command);
}
