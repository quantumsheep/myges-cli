#!/usr/bin/env node
import updateNotifier from 'update-notifier';
import * as commands from './commands';
import * as commandsBase from './commands-base';
import { config } from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

config();
const notifier = updateNotifier({
  pkg,
  shouldNotifyInNpmScript: true,
});

notifier.notify({ isGlobal: true });

const program = commandsBase.init();
commands.register(program);

if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
