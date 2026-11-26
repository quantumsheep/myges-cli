import type { Command } from "commander";
import inquirer from "inquirer";
import type { GlobalCommandOptions } from "../commands-base.js";
import { errorHandler, printError } from "../commands-base.js";
import * as configurator from "../config.js";
import * as display from "../display.js";
import { GesAPI } from "../ges-api.js";

export function register(program: Command) {
  program
    .command("courses [year]")
    .option("-r, --raw", "output the raw data")
    .description("list courses")
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

    const courses = await api.getCourses(year);

    if (options.raw) {
      console.log(JSON.stringify(courses));
    } else if (!courses) {
      console.log("Nothing to display.");
    } else {
      const trimesters = [...new Set(courses.map((course) => course.trimester))].sort();

      trimesters.forEach((trimester) => {
        const trimesterCourses = courses
          .filter((course) => course.trimester === trimester)
          .map((course) => ({
            rc_id: course.rc_id,
            Year: course.year,
            Trimester: `${course.trimester} (${course.trimester_id})`,
            Name: course.name,
            "Student group": `${course.student_group_name} (${course.student_group_id})`,
            Teacher: `${course.teacher} (${course.teacher_id})`,
          }));

        display.table(trimesterCourses);
      });
    }
  } catch (e) {
    printError(e, options.debug);
  }
}
