import type { Command } from "commander";
import * as chatSubcommand from "@/commands/projects/chat.js";
import * as groupsSubcommand from "@/commands/projects/groups.js";
import * as joinSubcommand from "@/commands/projects/join.js";
import * as lsSubcommand from "@/commands/projects/ls.js";
import * as quitSubcommand from "@/commands/projects/quit.js";
import * as showSubcommand from "@/commands/projects/show.js";
import * as stepsSubcommand from "@/commands/projects/steps.js";

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
