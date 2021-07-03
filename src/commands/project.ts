import colors from 'colors';
import { Command } from "commander";
import inquirer from "inquirer";
import readline from 'readline';
import * as configurator from '../config';
import * as display from '../display';
import * as api from '../ges-api';

export function register(program: Command) {
  program
    .command('project [id] [action] [value]')
    .option('-d, --debug', 'debug mode')
    .option('-r, --raw', 'output the raw data')
    .option('-y, --year', 'pre-select a year')
    .description("show a project's informations - possible actions: show, groups, join, quit")
    .action(action);
}

interface CommandOptions {
  debug: boolean;
  raw: boolean;
  year: string;
}

async function action(id: string, action: string, value: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);

    let project = null;

    if (!id) {
      if (!options.year) {
        const answers = await inquirer.prompt([
          {
            message: 'Choose a year',
            name: 'year',
            type: 'list',
            choices: await api.get_years(config),
          },
        ]);

        options.year = answers.year;
      }

      const projects = await api.request('GET', `/me/${options.year}/projects`, config);

      const answers = await inquirer.prompt([
        {
          message: 'Choose a project',
          name: 'project',
          type: 'list',
          choices: projects.map((project) => ({
            name: project.name,
            value: project.project_id,
          })),
        },
      ]);

      id = answers.project;
      project = projects.find((project) => project.project_id === id);
    } else {
      project = await api.request('GET', `/me/projects/${id}`, config);
    }

    if (!project) {
      return console.error(`Project ${id} not found.`);
    }

    const { uid } = await api.request('GET', '/me/profile', config);

    if (!action || action === 'show') {
      if (options.raw) {
        console.log(JSON.stringify(project));
      } else {
        const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

        let group_infos = {};

        if (group) {
          group_infos = {
            Group: `${group.group_name} (${group.project_group_id})`,
          };

          if (group.date_presentation > 0) {
            const date = new Date(group.date_presentation);

            group_infos['Presentation Date'] = `${date.toDateString()} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          }
        }

        display.table([
          {
            Name: colors.cyan('ID'),
            Value: project.project_id,
          },
          {
            Name: colors.cyan('Name'),
            Value: project.name,
          },
          ...Object.keys(group_infos).map((key) => ({
            Name: colors.cyan(key),
            Value: group_infos[key],
          })),
        ], false);
      }
    } else if (action === 'join') {
      let group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

      if (group) {
        return console.error(`You already are in a group for this project (${group.group_name}).`);
      }

      if (!value) {
        const answers = await inquirer.prompt([
          {
            message: 'Select the group to join',
            name: 'group',
            type: 'list',
            choices: project.groups.map((group) => {
              const students = (group.project_group_students || []).map((student) => `${student.firstname} ${student.name}`);

              return {
                name: group.group_name + (students.length > 0 ? `(${students.join(', ')})` : ''),
                value: group.project_group_id,
              };
            }),
          },
        ]);

        value = answers.group;
      }

      const numberValue = parseInt(value);
      if (isNaN(numberValue)) {
        return console.error('Incorrect group number.');
      }

      const groups = project.groups.sort((a, b) => a.project_group_id - b.project_group_id);

      if (numberValue > groups.length) {
        group = groups.find((group) => group.project_group_id == numberValue);
      } else {
        group = groups[numberValue - 1];
      }

      if (!group) {
        return console.error('Choosen group not found.');
      }

      try {
        const res = await api.request('POST', `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`, config);

        console.log('Successfully joined the group!');
      } catch (e) {
        if (options.debug) {
          console.error(e);
        } else {
          console.error("Failed to join the project's group.");
        }
      }
    } else if (action === 'quit') {
      const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

      if (!group) {
        return console.error('You are not actually in a group.');
      }

      const { confirm } = await inquirer.prompt([
        {
          message: `Do you really want to quit ${group.group_name}?`,
          name: 'confirm',
          type: 'confirm',
          default: false,
        },
      ]);

      if (confirm) {
        try {
          const res = await api.request('DELETE', `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`, config);

          console.log('Successfully quitted the group!');
        } catch (e) {
          if (options.debug) {
            console.error(e.response.data);
          } else {
            console.error("Failed to quit the project's group.");
          }
        }
      }
    } else if (action === 'groups') {
      display.table(project.groups.map((group) => ({
        id: group.project_group_id,
        name: group.group_name,
        ...(group.project_group_students || []).map((student) => `${student.firstname} ${student.name}`).reduce((acc, v, i) => {
          acc[`Student ${i + 1}`] = v;
          return acc;
        }, {}),
      })));
    } else if (action === 'chat') {
      const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.once('SIGINT', () => {
        process.exit(0);
      });

      const messages = await api.request('GET', `/me/projectGroups/${group.project_group_id}/messages`, config);

      function display_message(message) {
        const date = new Date(message.date);
        const date_str = `${date.getDate().toString().padStart(2, '0')}/${date.getMonth().toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        let prefix = '';

        if (message.uid === uid) {
          prefix = colors.grey(`[${date_str}] You`);
        } else {
          prefix = colors.cyan(`[${date_str}] ${message.firstname} ${message.name}`);
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

        const data = await api.request('GET', `/me/projectGroups/${group.project_group_id}/messages`, config);
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
          const messages = await api.request('POST', `/me/projectGroups/${group.project_group_id}/messages`, config, {
            data: {
              projectGroupId: group.project_group_id,
              message,
            },
          });

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
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
