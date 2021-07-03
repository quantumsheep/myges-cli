import { Command } from "commander";
import inquirer from "inquirer";
import * as configurator from '../config';
import * as display from '../display';
import * as api from '../ges-api';

export function register(program: Command) {
  program
    .command('projects [year]')
    .option('-d, --debug', 'debug mode')
    .option('-r, --raw', 'output the raw data')
    .description('list projects')
    .action(action);
}

interface CommandOptions {
  debug: boolean;
  raw: boolean;
}

async function action(year: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);

    if (!year) {
      const answers = await inquirer.prompt([
        {
          message: 'Choose a year',
          name: 'year',
          type: 'list',
          choices: await api.get_years(config),
        },
      ]);

      year = answers.year;
    }

    const projects = await api.request('GET', `/me/${year}/projects`, config);

    if (options.raw) {
      console.log(JSON.stringify(projects));
    } else if (!projects) {
      console.log('Nothing to display.');
    } else {
      const { uid } = await api.request('GET', '/me/profile', config);

      display.table(projects.map((project) => {
        const group = project.groups.find((group) => !!(group.project_group_students || []).find((student) => student.u_id === uid));

        const group_infos: Partial<{
          Test: number,
          Group: string,
        }> = {};

        if (group) {
          if (project.project_id == 5301) {
            group_infos.Test = 5;
          }

          group_infos.Group = `${group.group_name} (${group.project_group_id})`;

          if (group.date_presentation > 0) {
            const date = new Date(group.date_presentation);

            group_infos['Presentation Date'] = `${date.toDateString()} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          }
        }

        return {
          ID: project.project_id,
          Name: project.name,
          ...group_infos,
        };
      }));
    }
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}