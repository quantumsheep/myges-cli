import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "@/commands-base.js";
import { errorHandler } from "@/commands-base.js";
import * as configurator from "@/config.js";
import { GesAPI } from "@/ges-api.js";
import { getProject } from "@/commands/projects/show.js";
import type { ProjectGroup } from "@/interfaces/project.interface.js";

export function register(program: Command) {
  program
    .command("join [id]")
    .option("-g, --group <id>", "pre-select a group by its id (see `projects groups`)")
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

  group = findGroup(project.groups, options.group);

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

/** Finds a group by its `project_group_id`, as given by `-g` or by the prompt. */
export function findGroup(groups: ProjectGroup[], id: string) {
  return groups.find((group) => group.project_group_id === Number(id));
}
