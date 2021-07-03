import { Command } from 'commander';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';
import * as display from '../display';
import * as api from '../ges-api';

export function register(program: Command) {
  program
    .command('grades [year]')
    .option('-r, --raw', 'output the raw data')
    .description('list grades')
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

      year = answers.year;
    }

    const grades = await api.request('GET', `/me/${year}/grades`, config);

    if (options.raw) {
      console.log(JSON.stringify(grades));
    } else if (!grades) {
      console.log('Nothing to display.');
    } else {
      const trimesters = [...new Set(grades.map((grade) => grade.trimester))]
        .sort()
        .map((trimester) => {
          const trimester_grades = grades.filter(
            (grade) => grade.trimester === trimester,
          );

          const cc = Math.max(
            ...trimester_grades.map((grade) => grade.grades.length),
          );

          const ccs = trimester_grades.map((grade) =>
            [...Array(cc).keys()].reduce((o, i) => {
              o[`CC${i + 1}`] =
                grade.grades.length > i ? grade.grades[i] : null;
              return o;
            }, {}),
          );

          const trimester_grades_formated = trimester_grades.map((grade, i) => {
            const average =
              grade.average === null && grade.grades.length > 0
                ? grade.grades.reduce((a, b) => a + b, 0) / grade.grades.length
                : grade.average;

            return {
              Year: grade.year,
              Trimester: `${grade.trimester_name} (${grade.trimester})`,
              Teacher: `${grade.teacher_civility} ${grade.teacher_last_name} ${grade.teacher_first_name}`,
              Course: grade.course,
              'Coef. / ECTS': grade.coef || grade.ects,
              ...ccs[i],
              Exam: grade.exam,
              Average:
                average !== null ? Math.floor(average * 100) / 100 : null,
            };
          });

          let count = 0;
          const averages = trimester_grades_formated
            .map((grade) => {
              if (grade.Average !== null) {
                const coef = parseFloat(grade['Coef. / ECTS']) || 1;

                count += coef;
                return grade.Average * coef;
              }

              return null;
            })
            .filter((average) => average !== null);

          const average =
            count > 0 ? averages.reduce((a, b) => a + b, 0) / count || 0 : 0;
          trimester_grades_formated.push({
            Course: 'GLOBAL AVERAGE',
            Average: Math.floor(average * 100) / 100,
          });

          return trimester_grades_formated;
        });

      display.multiple(trimesters);
    }
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
