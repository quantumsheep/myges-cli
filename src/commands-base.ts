import { Command } from "commander";

const pkg = require('../package.json');

export interface GlobalCommandOptions {
  debug: boolean;
}

export function init() {
  const program = new Command()
    .version(pkg.version)
    .option('-d, --debug', 'debug mode')
    .on('option:debug', () => {
      process.env.DEBUG = 'true';
    });

  program.action(() => program.help());

  return program;
}

export function errorHandler(action: (...args: unknown[]) => void | Promise<void>) {
  return async (...args: unknown[]) => {
    const options = args.pop() as GlobalCommandOptions;

    try {
      await action(...args, options);
    } catch (e) {
      if (process.env.DEBUG) {
        console.error(e);
      } else {
        console.error(e.message);
      }
    }
  };
}
