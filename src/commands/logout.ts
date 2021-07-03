import { Command } from "commander";
import * as configurator from '../config';

export function register(program: Command) {
  program
    .command('logout')
    .option('-d, --debug', 'debug mode')
    .description('remove the saved auth informations')
    .action(action);
}

interface CommandOptions {
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
