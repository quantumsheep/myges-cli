import { Command } from "commander";
import inquirer from "inquirer";
import { errorHandler, GlobalCommandOptions } from "../../commands-base";
import * as configurator from '../../config';
import * as api from '../../ges-api';
import { getProject } from "./show";

export function register(program: Command) {
  program
    .command('quit [id]')
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
      await api.request('DELETE', `/me/courses/${project.rc_id}/projects/${project.project_id}/groups/${group.project_group_id}`, config);

      console.log('Successfully quitted the group!');
    } catch (e) {
      if (options.debug) {
        console.error(e.response.data);
      } else {
        console.error("Failed to quit the project's group.");
      }
    }
  }
}
