import { Command } from 'commander';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import inquirer from 'inquirer';
import { errorHandler, GlobalCommandOptions } from '../commands-base';
import * as configurator from '../config';
import * as api from '../ges-api';
import { AgendaItem } from '../interfaces/agenda.interface';
import { fr } from 'date-fns/locale';

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

    const agenda = await api.request<AgendaItem[]>(
      'GET',
      `/me/agenda?start=${start.valueOf()}&end=${end.valueOf()}`,
      config,
    );

    if (agenda.length === 0) {
      console.log('Nothing to display in this dates range.');
      return;
    }

    agenda = agenda.sort((a, b) => a.start_date - b.start_date);

    for (const agendaItem of agenda) {
      const start = new Date(agendaItem.start_date);
      const end = new Date(agendaItem.end_date);
      const course = agendaItem.name;
      const teacher = agendaItem.teacher;
      const date = format(start, 'EEEE d MMMM yyyy', {
        locale: fr,
      });
      const startTime = format(start, 'kk:mm');
      const endTime = format(end, 'kk:mm');
      console.log(
        `Cours : ${course} | Intervenant : ${teacher} | Date : ${date} (${startTime} - ${endTime}) | Lieux : ${agendaItem.rooms?.map(
          (room) =>
            ` ${room.campus.toUpperCase()} ${room.name} ${room.latitude},${
              room.longitude
            }`,
        )}`,
      );
    }
  } catch (e) {
    if (options.debug) {
      console.error(e);
    } else {
      console.error(e.message);
    }
  }
}
