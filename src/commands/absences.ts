import { Command } from "commander";
import inquirer from "inquirer";
import moment from "moment";
import { errorHandler, GlobalCommandOptions } from "../commands-base";
import * as configurator from '../config';
import * as display from '../display';
import * as api from '../ges-api';

export function register(program: Command) {
  program
    .command('absences [year]')
    .option('-r, --raw', 'output the raw data')
    .description('list absences')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
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

      // eslint-disable-next-line no-param-reassign
      year = answers.year;
    }

    const absences = await api.request('GET', `/me/${year}/absences`, config);

    if (options.raw) {
      console.log(JSON.stringify(absences));
    } else if (!absences) {
      console.log('Nothing to display.');
    } else {
      display.table(absences.map((absence) => ({
        Year: absence.year,
        Date: moment(absence.date).format('DD/MM/YYYY, HH:mm'),
        'Course name': absence.course_name,
        Justified: absence.justified,
        Trimester: absence.trimester_name,
      })));
    }
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
