import type { Command } from "commander";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "@/commands-base.js";
import { errorHandler, printError } from "@/commands-base.js";
import * as configurator from "@/config.js";
import { GesAPI } from "@/ges-api.js";
import type { GoogleConfig } from "@/google-calendar.js";
import type { AgendaItem } from "@/interfaces/agenda.interface.js";
import type { calendar_v3 } from "googleapis";
import { syncCalendar } from "@/google-calendar.js";

export function register(program: Command) {
  program
    .command("calendar-sync [days]")
    .option("-r, --reset_credentials", "reset google api credentials")
    .option("-c, --reset_calendar", "reset google calendar id")
    .description("sync myges calendar with Google Calendar")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  reset_credentials?: boolean;
  reset_calendar?: boolean;
}

async function action(days: string | undefined, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    let credentials: GoogleConfig;
    let calendarId: string | null;
    if (options.reset_credentials) {
      credentials = await configurator.setGoogleCredentials(await configurator.loadAll());
    } else {
      credentials = await configurator.loadGoogleCredentials();
    }
    if (options.reset_calendar) {
      calendarId = await configurator.setGoogleCalendarId(await configurator.loadAll());
    } else {
      calendarId = await configurator.loadGoogleCalendarId();
    }
    if (!calendarId) {
      throw new Error("Cannot retrieve Google calendar ID");
    }
    const api = new GesAPI(config);

    const now = new Date();

    if (!days) {
      const answers = await inquirer.prompt<{ days: number }>([
        {
          message: "Choose a number of days",
          name: "days",
          type: "number",
          default: 7,
        },
      ]);

      days = String(answers.days);
    }

    const start = startOfDay(now);
    const end = endOfDay(addDays(start, Number.parseInt(days, 10)));

    console.log(
      `Loading agenda from ${format(start, "dd-MM-yyyy")} to ${format(end, "dd-MM-yyyy")}...`,
    );

    await syncAgenda(await api.getAgenda(start, end), start, end, calendarId, credentials);
  } catch (e) {
    printError(e, options.debug);
    process.exitCode = 1;
  }
}

/**
 * Replaces the Google Calendar events between the two dates by the agenda.
 * Sets the exit code to 1 if the sync fails or if one API call fails.
 */
export async function syncAgenda(
  agenda: AgendaItem[],
  start: Date,
  end: Date,
  calendarId: string,
  credentials: GoogleConfig,
  calendar?: calendar_v3.Calendar,
) {
  try {
    if (agenda.length === 0) {
      console.log("Nothing to display in this dates range.");
    } else {
      agenda = agenda
        .sort((a, b) => a.start_date - b.start_date)
        .filter(
          (item, index, agendaArray) =>
            index === 0 || item.reservation_id !== agendaArray[index - 1].reservation_id,
        );
      console.log(`Found ${agenda.length} events in this date range`);
    }
    console.log("Removing previous events on calendar in given date range...");

    if ((await syncCalendar(agenda, start, end, calendarId, credentials, calendar)) > 0) {
      process.exitCode = 1;
    }
  } catch (e) {
    printError(e);
    process.exitCode = 1;
  }
}
