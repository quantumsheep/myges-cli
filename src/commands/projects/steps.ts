import colors from 'colors';
import { Command } from 'commander';
import moment from 'moment';
import { errorHandler, GlobalCommandOptions } from '../../commands-base';
import * as configurator from '../../config';
import * as display from '../../display';
import { GesAPI } from '../../ges-api';
import { getProject } from './show';

export function register(program: Command) {
  program
    .command('steps [id]')
    .option('-a, --all', 'All next steps')
    .option('-n, --next', 'All next steps')
    .option('-y, --year <year>', 'pre-select a year')
    .option('-r, --raw', 'output the raw data')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  all: boolean;
  next: boolean;
  year: string;
  raw: boolean;
}

export interface Step {
  course_name: string;
  group_id: number;
  pro_id: number;
  pro_name: string;
  psp_desc: string;
  psp_id: number;
  psp_limit_date: number;
  psp_number: number;
  psp_type: string;
  type: string;
}

async function action(id: string, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  if (options.all) {
    const steps = await api.getNextProjectSteps();

    if (options.raw) {
      console.log(JSON.stringify(steps));
      return;
    }

    display.table(
      steps.map((step) => ({
        'Project ID': step.pro_id,
        Type: step.psp_type,
        'Limit Date': moment(step.psp_limit_date).format('LL'),
        'Project Name': step.pro_name,
        Course: step.course_name,
      })),
    );

    return;
  }

  const project = await getProject(id, options);

  const print = (name: string, value: unknown) => {
    console.log(`${colors.cyan(name.padEnd(13, ' '))}${value}`);
  };

  print('ID', project.project_id);
  print('Project Name', project.name);

  project.steps
    .filter((step) => step.pro_id === project.project_id)
    .filter((step) => !options.next || step.psp_limit_date >= Date.now())
    .forEach((step) => {
      console.log('');

      print('Limit Date', moment(step.psp_limit_date).format('LL'));
      print('Type', step.psp_type);
      print('Description', step.psp_desc.trim());
    });
}
