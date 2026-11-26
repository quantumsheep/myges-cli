import type { Command } from "commander";
import type { GlobalCommandOptions } from "#src/commands-base.js";
import { errorHandler, printError } from "#src/commands-base.js";
import * as configurator from "#src/config.js";

export function register(program: Command) {
  program
    .command("logout")
    .description("remove the saved auth informations")
    .action(errorHandler(action));
}

type CommandOptions = GlobalCommandOptions;

async function action(options: CommandOptions) {
  try {
    await configurator.erase();

    console.log("Successfully logged out!");
  } catch (e) {
    printError(e, options.debug);
  }
}
