import commander from 'commander';
import update_notifier from 'update-notifier';
import * as commands from './commands';

const pkg = require('../package.json');

const notifier = update_notifier({
  pkg,
  shouldNotifyInNpmScript: true,
});

notifier.notify({
  isGlobal: true,
});

const program = new commander.Command();
program.version(pkg.version);

commands.register(program);

program.action(() => program.help());

if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
