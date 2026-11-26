import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "@/commands-base.js";
import { errorHandler } from "@/commands-base.js";
import * as configurator from "@/config.js";
import { GesAPI } from "@/ges-api.js";
import { getProject } from "@/commands/projects/show.js";

export function register(program: Command) {
  program
    .command("join [id]")
    .option("-g, --group", "pre-select a group")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  group?: string;
  year?: string;
}

async function action(id: string | undefined, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  const project = await getProject(id, options);
  const { uid } = await api.getProfile();

  let group = project.groups.find(
    (group) => !!(group.project_group_students ?? []).find((student) => student.u_id === uid),
  );

  if (group) {
    console.error(`You already are in a group for this project (${group.group_name}).`);
    return;
  }

  if (!options.group) {
    const answers = await inquirer.prompt<{ group: number }>([
      {
        message: "Select the group to join",
        name: "group",
        type: "select",
        choices: project.groups.map((group) => {
          const students = (group.project_group_students ?? []).map(
            (student) => `${student.firstname} ${student.name}`,
          );

          return {
            name: group.group_name + (students.length > 0 ? ` (${students.join(", ")})` : ""),
            value: group.project_group_id,
          };
        }),
      },
    ]);

    options.group = String(answers.group);
  }

  const numberValue = parseInt(options.group, 10);
  if (isNaN(numberValue)) {
    console.error("Incorrect group number.");
    return;
  }

  const groups = project.groups.sort((a, b) => a.project_group_id - b.project_group_id);

  if (numberValue > groups.length) {
    group = groups.find((group) => group.project_group_id === numberValue);
  } else {
    group = groups[numberValue - 1];
  }

  if (!group) {
    console.error("Choosen group not found.");
    return;
  }

  try {
    await api.joinProjectGroup(project.rc_id, project.project_id, group.project_group_id);

    console.log("Successfully joined the group!");
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error("Failed to join the project's group.");
    }
  }
}
