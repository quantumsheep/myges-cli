import { Command } from 'commander';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';
import { GesAPI } from '../ges-api';
import { pushToCalendar, removeEvents } from '../google-calendar';

export function register(program: Command) {
  program
    .command('calendar-sync [days]')
    .description('sync myges calendar with Google Calendar')
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  debug: boolean;
}

async function action(days: string, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    const credentials = await configurator.loadGoogleCredentials();
    const calendarId = await configurator.loadGoogleCalendarId();
    const api = new GesAPI(config);

    const now = new Date();

    if (!days) {
      const answers = await inquirer.prompt([
        {
          message: 'Choose a number of days',
          name: 'days',
          type: 'number',
          default: 7,
        },
      ]);

      days = answers.days;
    }

    const start = startOfDay(now);
    const end = endOfDay(addDays(start, Number.parseInt(days)));

    console.log(
      `Loading agenda from ${format(start, 'dd-MM-yyyy')} to ${format(
        end,
        'dd-MM-yyyy',
      )}...`,
    );

    let agenda = await api.getAgenda(start, end);

    if (agenda.length === 0) {
      console.log('Nothing to display in this dates range.');
      return;
    }

    agenda = [...agenda]
      .sort((a, b) => a.start_date - b.start_date)
      .filter(
        (item, index, agendaArray) =>
          index === 0 ||
          item.reservation_id != agendaArray[index - 1].reservation_id,
      );
    console.log(`Found ${agenda.length} events in this date range`);
    console.log('Removing previous events on calendar in given date range...');
    removeEvents(start, end, calendarId, credentials);

      pushToCalendar(agenda, calendarId, credentials);
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
