import { Command } from 'commander';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as configurator from '../../config';
import * as api from '../../ges-api';
import { getProject } from './show';

export function register(program: Command) {
  program
    .command('join [id]')
    .option('-g, --group', 'pre-select a group')
    .option('-y, --year <year>', 'pre-select a year')
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

  let group = project.groups.find(
    (group) =>
      !!(group.project_group_students || []).find(
        (student) => student.u_id === uid,
      ),
  );

  if (group) {
    return console.error(
      `You already are in a group for this project (${group.group_name}).`,
    );
  }

  if (!options.group) {
    const answers = await inquirer.prompt([
      {
        message: 'Select the group to join',
        name: 'group',
        type: 'list',
        choices: project.groups.map((group) => {
          const students = (group.project_group_students || []).map(
            (student) => `${student.firstname} ${student.name}`,
          );

          return {
            name:
              group.group_name +
              (students.length > 0 ? `(${students.join(', ')})` : ''),
            value: group.project_group_id,
          };
        }),
      },
    ]);

    options.group = answers.group;
  }

  const numberValue = parseInt(options.group);
  if (isNaN(numberValue)) {
    return console.error('Incorrect group number.');
  }

  const groups = project.groups.sort(
    (a, b) => a.project_group_id - b.project_group_id,
  );

  if (numberValue > groups.length) {
    group = groups.find((group) => group.project_group_id == numberValue);
  } else {
    group = groups[numberValue - 1];
  }

  if (!group) {
    return console.error('Choosen group not found.');
  }

  try {
    await api.request(
      'POST',
      `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`,
      config,
    );

    console.log('Successfully joined the group!');
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error("Failed to join the project's group.");
    }
  }
}
