import colors from 'colors';
import { Command } from 'commander';
import readline from 'readline';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as configurator from '../../config';
import * as api from '../../ges-api';
import { getProject } from './show';

export function register(program: Command) {
  program
    .command('chat [id]')
    .option('-y, --year', 'pre-select a year')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  group?: string;
  year?: string;
}

async function action(id: string, options: CommandOptions) {
  const config = await configurator.load(true);
  const project = await getProject(id, options);

  const { uid } = await api.request('GET', '/me/profile', config);

  const group = project.groups.find(
    (group) =>
      !!(group.project_group_students || []).find(
        (student) => student.u_id === uid,
      ),
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.once('SIGINT', () => {
    process.exit(0);
  });

  const messages = await api.request(
    'GET',
    `/me/projectGroups/${group.project_group_id}/messages`,
    config,
  );

  function display_message(message) {
    const date = new Date(message.date);
    const date_str = `${date.getDate().toString().padStart(2, '0')}/${date
      .getMonth()
      .toString()
      .padStart(2, '0')}/${date.getFullYear()} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    let prefix = '';

    if (message.uid === uid) {
      prefix = colors.grey(`[${date_str}] You`);
    } else {
      prefix = colors.cyan(
        `[${date_str}] ${message.firstname} ${message.name}`,
      );
    }

    console.log(`${prefix}${colors.grey(':')} ${message.message}`);
  }

  messages.forEach(display_message);

  let timer = null;

  async function update_messages() {
    if (timer) {
      clearTimeout(timer);
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    const data = await api.request(
      'GET',
      `/me/projectGroups/${group.project_group_id}/messages`,
      config,
    );
    const new_messages = data.slice(messages.length);

    for (const message of new_messages) {
      display_message(message);
      messages.push(message);
    }

    timer = setTimeout(update_messages, 20000);
    rl.prompt();
  }

  rl.on('line', async (message) => {
    try {
      const messages = await api.request(
        'POST',
        `/me/projectGroups/${group.project_group_id}/messages`,
        config,
        {
          data: {
            projectGroupId: group.project_group_id,
            message,
          },
        },
      );

      await update_messages();
    } catch (e) {
      if (options.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }

      rl.prompt();
    }
  });

  await update_messages();
}
