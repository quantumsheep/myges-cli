import colors from 'colors';
import { Command } from "commander";
import * as display from '../display';

export function register(program: Command) {
  program
    .command('contribute')
    .description('show useful links')
    .action(action);
}

async function action() {
  display.table([
    {
      Name: colors.cyan('Réseau GES (GHG Network)'),
      Value: 'http://www.reseau-ges.fr',
    },
    {
      Name: colors.cyan('GitHub repository'),
      Value: 'https://github.com/quantumsheep/myges-cli',
    },
    {
      Name: colors.cyan('Issues'),
      Value: 'https://github.com/quantumsheep/myges-cli/issues',
    },
  ], false);
}
