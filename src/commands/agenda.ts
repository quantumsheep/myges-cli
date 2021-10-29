import { Command } from 'commander';
import inquirer from 'inquirer';
import moment from 'moment';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';
import * as display from '../display';
import { GesAPI } from '../ges-api';

export function register(program: Command) {
  program
    .command('agenda [week]')
    .option('-r, --raw', 'output the raw data')
    .option('-i, --interactive', 'interactive mode')
    .description('fetch agenda')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  debug: boolean;
  raw: boolean;
  interactive: boolean;
}

async function action(week: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    const api = new GesAPI(config);

    const now = moment();

    if (!week) {
      const middle = now.clone().subtract(now.day(), 'day').set('hours', 23);

      if (options.interactive) {
        const to_range = (start: moment.Moment) => {
          const end = start.clone().add(7, 'days');

          const start_str = start.format('DD-MM-YYYY');
          const end_str = end.format('DD-MM-YYYY');

          return `${start_str} ${end_str}`;
        };

        const before = [...Array(9).keys()]
          .map((i) => to_range(middle.clone().add((i + 1) * 7, 'days')))
          .reverse();
        const after = [...Array(9).keys()].map((i) =>
          to_range(middle.clone().subtract((i + 1) * 7, 'days')),
        );

        const middle_range = to_range(middle.clone());

        const answers = await inquirer.prompt([
          {
            message: 'Choose a week',
            name: 'week',
            type: 'list',
            choices: [...before, middle_range, ...after],
            default: middle_range,
          },
        ]);

        week = answers.week.split(' ')[0];
      } else {
        week = middle.format('DD-MM-YYYY');
      }
    }

    let start = moment().set('hours', 0);
    let end = moment().set('hours', 23);

    let pass = +(week.split('+')[1] || 0);

    if (week.startsWith('today')) {
      start = start.add(pass, 'days');
      end.add(pass, 'days');
    } else if (week.startsWith('tomorrow')) {
      start.add(pass + 1, 'days');
      end.add(pass + 1, 'days');
    } else if (week.startsWith('yesterday')) {
      start = start.subtract(pass + 1, 'days');
      end.subtract(pass + 1, 'days');
    } else {
      if (week.startsWith('week')) {
        pass *= 7;
        week = now.format('DD-MM-YYYY');
      }

      const [date, month = now.month() + 1, year = now.year()] = week
        .split(/[\-\+]/g)
        .map((v) => parseInt(v, 10));

      const selected = moment()
        .set('year', year)
        .set('month', month - 1)
        .set('date', date + pass)
        .set('hours', 23);

      start = selected.clone().subtract(selected.day(), 'days');
      end = start.clone().add(7, 'days');
    }

    if (start.isSame(end)) {
      console.log(`Loading agenda for ${start.format('DD-MM-YYYY')}...`);
    } else {
      console.log(
        `Loading agenda from ${start.format('DD-MM-YYYY')} to ${end.format(
          'DD-MM-YYYY',
        )}...`,
      );
    }

    const agenda = await api.getAgenda(start.toDate(), end.toDate());

    if (options.raw) {
      console.log(JSON.stringify(agenda));
    } else {
      if (agenda.length === 0) {
        console.log('Nothing to display in this dates range.');
      }

      const days = agenda
        .map((activity) => moment(activity.start_date))
        .sort((a, b) => a.diff(b))
        .map((day) => day.toDate().toDateString());

      const unique_days = [...new Set(days)];

      const trimesters = unique_days.map((day) => {
        const day_activities = agenda
          .filter(
            (activity) =>
              moment(activity.start_date).toDate().toDateString() === day,
          )
          .sort((a, b) => a.start_date - b.start_date);

        return day_activities.map((activity) => {
          const activity_start = moment(activity.start_date);
          const activity_end = moment(activity.end_date);

          const mesure = moment('11:30', 'HH:mm').format('LT').length;

          let rooms = activity.modality === 'Distanciel' ? 'Remote' : 'Unknown';

          if (activity.rooms?.length > 0) {
            const roomInfo = activity.rooms[0];
            rooms = activity.rooms
              .map(
                () => `${roomInfo.campus} ${roomInfo.name} (${roomInfo.floor})`,
              )
              .join(' - ');
          }

          return {
            Day: activity_start.format('ddd, LL'),
            Schedule: `${activity_start
              .format('LT')
              .padStart(mesure, '0')} -> ${activity_end
              .format('LT')
              .padStart(mesure, '0')}`,
            'Room(s)': rooms,
            Name: activity.name,
            Teacher: activity.teacher,
          };
        });
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
