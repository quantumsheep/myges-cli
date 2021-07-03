import { Command } from 'commander';
import * as configurator from '../config';
import * as api from '../ges-api';
import * as display from '../display';
import { Method } from 'axios';
import { errorHandler, GlobalCommandOptions } from '../commands-base';

export function register(program: Command) {
  program
    .command('request <method> <url>')
    .option('-r, --raw', 'output the raw data')
    .option('-t, --table', 'output data in a table')
    .option('-b, --body <value>', 'add a body (must be a JSON)', '{}')
    .description('make a request to the API')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  debug: boolean;
  raw: boolean;
  table: boolean;
  body: Record<string, unknown>;
}

async function action(method: Method, url: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);

    const result = await api.request(method, url, config, {
      data: options.body,
      headers: {
        'Content-type': 'application/json; charset=utf-8',
      },
    });

    if (options.raw) {
      console.log(JSON.stringify(result));
    } else if (options.table) {
      display.table(result);
    } else {
      console.log(result);
    }
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
