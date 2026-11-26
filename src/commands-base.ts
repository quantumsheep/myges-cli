import { Command } from "commander";
import { pkg } from "#src/package-info.js";

export interface GlobalCommandOptions {
  debug?: boolean;
}

export function init() {
  const program = new Command()
    .version(pkg.version)
    .allowExcessArguments()
    .option("-d, --debug", "debug mode")
    .on("option:debug", () => {
      process.env.DEBUG = "true";
    });

  program.action(() => program.help());

  return program;
}

/** Prints an error: the full error in debug mode, else only its message. */
export function printError(e: unknown, debug = !!process.env.DEBUG) {
  if (debug) {
    console.error(e);
  } else {
    console.error(e instanceof Error ? e.message : e);
  }
}

export function errorHandler<A extends unknown[]>(action: (...args: A) => void | Promise<void>) {
  return async (...args: A) => {
    try {
      await action(...args);
    } catch (e) {
      printError(e);
    }
  };
}
