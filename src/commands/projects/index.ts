import type { Command } from "commander";
import * as chatSubcommand from "./chat.js";
import * as groupsSubcommand from "./groups.js";
import * as joinSubcommand from "./join.js";
import * as lsSubcommand from "./ls.js";
import * as quitSubcommand from "./quit.js";
import * as showSubcommand from "./show.js";
import * as stepsSubcommand from "./steps.js";

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
