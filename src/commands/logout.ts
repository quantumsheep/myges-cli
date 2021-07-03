import { Command } from 'commander';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';

export function register(program: Command) {
  program
    .command('logout')
    .description('remove the saved auth informations')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  debug: boolean;
}

async function action(options: CommandOptions) {
  try {
    await configurator.erase();

    console.log('Successfully logged out!');
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
