import type { Command } from "commander";
import type { GlobalCommandOptions } from "@/commands-base.js";
import { errorHandler } from "@/commands-base.js";
import * as display from "@/display.js";
import { getProject } from "@/commands/projects/show.js";

export function register(program: Command) {
  program
    .command("groups [id]")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  group?: string;
  year?: string;
}

async function action(id: string | undefined, options: CommandOptions) {
  const project = await getProject(id, options);

  display.table(
    project.groups.map((group) => ({
      id: group.project_group_id,
      name: group.group_name,
      ...(group.project_group_students ?? [])
        .map((student) => `${student.firstname} ${student.name}`)
        .reduce<Record<string, string>>((acc, v, i) => {
          acc[`Student ${i + 1}`] = v;
          return acc;
        }, {}),
    })),
  );
}
