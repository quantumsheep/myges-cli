import { Command } from "commander";
import * as configurator from '../config';

export function register(program: Command) {
  program
    .command('login')
    .option('-d, --debug', 'debug mode')
    .description('sign in to an account')
    .action(action);
}

interface CommandOptions {
  debug: boolean;
}

async function action(options: CommandOptions) {
  try {
    const token = await configurator.prompt_credentials();

    await configurator.save({
      username: token.username,
      token_type: token.token_type,
      access_token: token.access_token,
      expires: Date.now() + (parseInt(token.expires_in, 10) * 1000),
    });

    console.log('Successfully logged in!');
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
