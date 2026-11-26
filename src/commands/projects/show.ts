import { styleText } from "node:util";
import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "../../commands-base.js";
import { errorHandler } from "../../commands-base.js";
import * as configurator from "../../config.js";
import * as display from "../../display.js";
import { formatPresentationDate } from "../../dates.js";
import { GesAPI } from "../../ges-api.js";
import type { Project } from "../../interfaces/project.interface.js";

export function register(program: Command) {
  program
    .command("show [id]")
    .option("-r, --raw", "output the raw data")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw?: boolean;
  year?: string;
}

async function action(id: string | undefined, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  const project = await getProject(id, options);

  if (options.raw) {
    console.log(JSON.stringify(project));
  } else {
    const { uid } = await api.getProfile();

    const group = project.groups.find(
      (group) => !!(group.project_group_students ?? []).find((student) => student.u_id === uid),
    );

    let group_infos: Record<string, string> = {};

    if (group) {
      group_infos = {
        Group: `${group.group_name} (${group.project_group_id})`,
      };

      if (group.date_presentation && group.date_presentation > 0) {
        group_infos["Presentation Date"] = formatPresentationDate(group.date_presentation);
      }
    }

    display.table(
      [
        {
          Name: styleText("cyan", "ID"),
          Value: project.project_id,
        },
        {
          Name: styleText("cyan", "Name"),
          Value: project.name,
        },
        ...Object.keys(group_infos).map((key) => ({
          Name: styleText("cyan", key),
          Value: group_infos[key],
        })),
      ],
      false,
    );
  }
}

export async function getProject(id?: string, options: { year?: string } = {}) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  let project: Project | undefined;

  if (!id) {
    if (!options.year) {
      const answers = await inquirer.prompt<{ year: number }>([
        {
          message: "Choose a year",
          name: "year",
          type: "select",
          choices: await api.getYears(),
        },
      ]);

      options.year = String(answers.year);
    }

    const projects = await api.getProjects(options.year);

    if (!projects) {
      throw new Error(`No projects found for year ${options.year}.`);
    }

    const answers = await inquirer.prompt<{ project: number }>([
      {
        message: "Choose a project",
        name: "project",
        type: "select",
        choices: projects.map((project) => ({
          name: project.name,
          value: project.project_id,
        })),
      },
    ]);

    id = String(answers.project);
    project = projects.find((project) => project.project_id === answers.project);
  } else {
    project = await api.getProject(id);
  }

  if (!project) {
    throw new Error(`Project ${id} not found.`);
  }

  return project;
}
