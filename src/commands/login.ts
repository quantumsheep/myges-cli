import type { Command } from "commander";
import type { GlobalCommandOptions } from "#src/commands-base.js";
import { errorHandler, printError } from "#src/commands-base.js";
import * as configurator from "#src/config.js";

export function register(program: Command) {
  program.command("login").description("sign in to an account").action(errorHandler(action));
}

type CommandOptions = GlobalCommandOptions;

async function action(options: CommandOptions) {
  try {
    const token = await configurator.prompt_credentials();

    await configurator.save({
      username: token.username,
      token_type: token.token_type,
      access_token: token.access_token,
      expires: Date.now() + parseInt(token.expires_in, 10) * 1000,
    });

    console.log("Successfully logged in!");
  } catch (e) {
    printError(e, options.debug);
  }
}
