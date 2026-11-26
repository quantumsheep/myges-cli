import type { Command } from "commander";
import inquirer from "inquirer";
import { formatDateTime } from "#src/dates.js";
import type { GlobalCommandOptions } from "#src/commands-base.js";
import { errorHandler, printError } from "#src/commands-base.js";
import * as configurator from "#src/config.js";
import * as display from "#src/display.js";
import { GesAPI } from "#src/ges-api.js";

export function register(program: Command) {
  program
    .command("absences [year]")
    .option("-r, --raw", "output the raw data")
    .description("list absences")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  raw?: boolean;
}

async function action(year: string | undefined, options: CommandOptions) {
  try {
    const config = await configurator.load(true);
    const api = new GesAPI(config);

    if (!year) {
      const answers = await inquirer.prompt<{ year: number }>([
        {
          message: "Choose a year",
          name: "year",
          type: "select",
          choices: await api.getYears(),
        },
      ]);

      year = String(answers.year);
    }

    const absences = await api.getAbsences(year);

    if (options.raw) {
      console.log(JSON.stringify(absences));
    } else if (!absences) {
      console.log("Nothing to display.");
    } else {
      display.table(
        absences.map((absence) => ({
          Year: absence.year,
          Date: formatDateTime(absence.date),
          "Course name": absence.course_name,
          Justified: absence.justified,
          Trimester: absence.trimester_name,
        })),
      );
    }
  } catch (e) {
    printError(e, options.debug);
  }
}
