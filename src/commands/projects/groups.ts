import { Command } from 'commander';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as display from '../../display';
import { getProject } from './show';

export function register(program: Command) {
  program
    .command('groups [id]')
    .option('-y, --year <year>', 'pre-select a year')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  group?: string;
  year?: string;
}

async function action(id: string, options: CommandOptions) {
  const project = await getProject(id, options);

  display.table(
    project.groups.map((group) => ({
      id: group.project_group_id,
      name: group.group_name,
      ...(group.project_group_students || [])
        .map((student) => `${student.firstname} ${student.name}`)
        .reduce((acc, v, i) => {
          acc[`Student ${i + 1}`] = v;
          return acc;
        }, {}),
    })),
  );
}
