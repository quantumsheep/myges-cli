import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "../../commands-base.js";
import { errorHandler } from "../../commands-base.js";
import * as configurator from "../../config.js";
import { GesAPI, HttpError } from "../../ges-api.js";
import { getProject } from "./show.js";

export function register(program: Command) {
  program
    .command("quit [id]")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  year?: string;
}

async function action(id: string | undefined, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  const project = await getProject(id, options);

  const { uid } = await api.getProfile();

  const group = project.groups.find(
    (group) => !!(group.project_group_students ?? []).find((student) => student.u_id === uid),
  );

  if (!group) {
    console.error("You are not actually in a group.");
    return;
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      message: `Do you really want to quit ${group.group_name}?`,
      name: "confirm",
      type: "confirm",
      default: false,
    },
  ]);

  if (confirm) {
    try {
      await api.quitProjectGroup(project.rc_id, project.project_id, group.project_group_id);

      console.log("Successfully quitted the group!");
    } catch (e) {
      if (options.debug) {
        console.error(e instanceof HttpError ? e.response.data : e);
      } else {
        console.error("Failed to quit the project's group.");
      }
    }
  }
}
