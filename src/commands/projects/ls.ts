import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "../../commands-base.js";
import { errorHandler } from "../../commands-base.js";
import * as configurator from "../../config.js";
import * as display from "../../display.js";
import { formatPresentationDate } from "../../dates.js";
import { GesAPI } from "../../ges-api.js";

export function register(program: Command) {
  program
    .command("ls [year]")
    .option("-r, --raw", "output the raw data")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw?: boolean;
  year?: string;
}

async function action(year: string | undefined, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  if (!year) {
    const answers = await inquirer.prompt<{ year: number }>([
      {
        message: "Choose a year",
        name: "year",
        type: "select",
        choices: await api.getYears(),
      },
    ]);

    year = String(answers.year);
  }

  const projects = await api.getProjects(year);

  if (options.raw) {
    console.log(JSON.stringify(projects));
  } else if (!projects) {
    console.log("Nothing to display.");
  } else {
    const { uid } = await api.getProfile();

    display.table(
      projects.map((project) => {
        const group = project.groups.find(
          (group) => !!(group.project_group_students ?? []).find((student) => student.u_id === uid),
        );

        const group_infos: Record<string, string | number> = {};

        if (group) {
          if (project.project_id === 5301) {
            group_infos.Test = 5;
          }

          group_infos.Group = `${group.group_name} (${group.project_group_id})`;

          if (group.date_presentation && group.date_presentation > 0) {
            group_infos["Presentation Date"] = formatPresentationDate(group.date_presentation);
          }
        }

        return {
          ID: project.project_id,
          Name: project.name,
          ...group_infos,
        };
      }),
    );
  }
}
