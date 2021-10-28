import colors from 'colors';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as configurator from '../../config';
import * as display from '../../display';
import { GesAPI } from '../../ges-api';
import { Project } from '../../interfaces/project.interface';

export function register(program: Command) {
  program
    .command('show [id]')
    .option('-r, --raw', 'output the raw data')
    .option('-y, --year <year>', 'pre-select a year')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw: boolean;
  year?: string;
}

async function action(id: string, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  const project = await getProject(id, options);

  if (options.raw) {
    console.log(JSON.stringify(project));
  } else {
    const { uid } = await api.getProfile();

    const group = project.groups.find(
      (group) =>
        !!(group.project_group_students || []).find(
          (student) => student.u_id === uid,
        ),
    );

    let group_infos = {};

    if (group) {
      group_infos = {
        Group: `${group.group_name} (${group.project_group_id})`,
      };

      if (group.date_presentation > 0) {
        const date = new Date(group.date_presentation);

        group_infos['Presentation Date'] = `${date.toDateString()} at ${date
          .getHours()
          .toString()
          .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    display.table(
      [
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
      ],
      false,
    );
  }
}

export async function getProject(id?: string, options?: { year?: string }) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  let project: Project = null;

  if (!id) {
    if (!options.year) {
      const answers = await inquirer.prompt([
        {
          message: 'Choose a year',
          name: 'year',
          type: 'list',
          choices: await api.getYears(),
        },
      ]);

      options.year = answers.year;
    }

    const projects = await api.getProjects(options.year);

    if (!projects) {
      throw new Error(`No projects found for year ${options.year}.`);
    }

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
    project = await api.getProject(id);
  }

  if (!project) {
    throw new Error(`Project ${id} not found.`);
  }

  return project;
}
