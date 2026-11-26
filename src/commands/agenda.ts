import type { Command } from "commander";
import { addDays, subDays } from "date-fns";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "../commands-base.js";
import { errorHandler, printError } from "../commands-base.js";
import * as configurator from "../config.js";
import {
  agendaRange,
  formatDay,
  formatTime,
  formatWeekdayDate,
  weekMiddle,
  weekRange,
} from "../dates.js";
import * as display from "../display.js";
import { GesAPI } from "../ges-api.js";

export function register(program: Command) {
  program
    .command("agenda [week]")
    .option("-r, --raw", "output the raw data")
    .option("-i, --interactive", "interactive mode")
    .description("fetch agenda")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw?: boolean;
  interactive?: boolean;
}

async function action(week: string | undefined, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    const api = new GesAPI(config);

    const now = new Date();

    if (!week) {
      const middle = weekMiddle(now);

      if (options.interactive) {
        const before = [...Array(9).keys()]
          .map((i) => weekRange(addDays(middle, (i + 1) * 7)))
          .reverse();
        const after = [...Array(9).keys()].map((i) => weekRange(subDays(middle, (i + 1) * 7)));

        const middle_range = weekRange(middle);

        const answers = await inquirer.prompt<{ week: string }>([
          {
            message: "Choose a week",
            name: "week",
            type: "select",
            choices: [...before, middle_range, ...after],
            default: middle_range,
          },
        ]);

        week = answers.week.split(" ")[0];
      } else {
        week = formatDay(middle);
      }
    }

    const { start, end } = agendaRange(week, now);

    if (start.getTime() === end.getTime()) {
      console.log(`Loading agenda for ${formatDay(start)}...`);
    } else {
      console.log(`Loading agenda from ${formatDay(start)} to ${formatDay(end)}...`);
    }

    const agenda = await api.getAgenda(start, end);

    if (options.raw) {
      console.log(JSON.stringify(agenda));
    } else {
      if (agenda.length === 0) {
        console.log("Nothing to display in this dates range.");
      }

      const days = agenda
        .map((activity) => activity.start_date)
        .sort((a, b) => a - b)
        .map((day) => new Date(day).toDateString());

      const unique_days = [...new Set(days)];

      const trimesters = unique_days.map((day) => {
        const day_activities = agenda
          .filter((activity) => new Date(activity.start_date).toDateString() === day)
          .sort((a, b) => a.start_date - b.start_date);

        return day_activities.map((activity) => {
          let rooms = activity.modality === "Distanciel" ? "Remote" : "Unknown";

          if (activity.rooms && activity.rooms.length > 0) {
            rooms = activity.rooms
              .map((room) => `${room.campus} ${room.name} (${room.floor})`)
              .join(" - ");
          }

          return {
            Day: formatWeekdayDate(activity.start_date),
            Schedule: `${formatTime(activity.start_date)} -> ${formatTime(activity.end_date)}`,
            "Room(s)": rooms,
            Name: activity.name,
            Teacher: activity.teacher,
          };
        });
      });

      display.multiple(trimesters);
    }
  } catch (e) {
    printError(e, options.debug);
  }
}
