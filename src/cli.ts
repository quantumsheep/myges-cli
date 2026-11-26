#!/usr/bin/env node
import updateNotifier from "update-notifier";
import * as commands from "#src/commands/index.js";
import * as commandsBase from "#src/commands-base.js";
import { pkg } from "#src/package-info.js";

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
