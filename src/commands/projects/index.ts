import { Command } from "commander";
import * as chatSubcommand from './chat';
import * as groupsSubcommand from './groups';
import * as joinSubcommand from './join';
import * as lsSubcommand from './ls';
import * as quitSubcommand from './quit';
import * as showSubcommand from './show';

export function register(program: Command) {
  const command = program
    .command('projects')
    .description("manage projects");

  chatSubcommand.register(command);
  groupsSubcommand.register(command);
  joinSubcommand.register(command);
  lsSubcommand.register(command);
  quitSubcommand.register(command);
  showSubcommand.register(command);
}
