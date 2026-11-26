import type { Command } from "commander";
import * as configurator from "#src/config.js";
import * as display from "#src/display.js";
import type { GlobalCommandOptions } from "#src/commands-base.js";
import { errorHandler, printError } from "#src/commands-base.js";
import { GesAPI } from "#src/ges-api.js";

export function register(program: Command) {
  program
    .command("request <method> <url>")
    .option("-r, --raw", "output the raw data")
    .option("-t, --table", "output data in a table")
    .option("-b, --body <value>", "add a body (must be a JSON)", "{}")
    .description("make a request to the API")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw?: boolean;
  table?: boolean;
  body: string;
}

async function action(method: string, url: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    const api = new GesAPI(config);

    const result = await api.request(method, url, {
      data: options.body,
      headers: {
        "Content-type": "application/json; charset=utf-8",
      },
    });

    if (options.raw) {
      console.log(JSON.stringify(result));
    } else if (options.table) {
      // The endpoint is chosen by the user: assume it returns a list.
      display.table(result as Record<string, unknown>[]);
    } else {
      console.log(result);
    }
  } catch (e) {
    printError(e, options.debug);
  }
}
