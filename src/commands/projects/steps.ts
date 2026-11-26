import { styleText } from "node:util";
import type { Command } from "commander";
import { formatLongDate } from "../../dates.js";
import type { GlobalCommandOptions } from "../../commands-base.js";
import { errorHandler } from "../../commands-base.js";
import * as configurator from "../../config.js";
import * as display from "../../display.js";
import { GesAPI } from "../../ges-api.js";
import { getProject } from "./show.js";

export function register(program: Command) {
  program
    .command("steps [id]")
    .option("-a, --all", "All next steps")
    .option("-n, --next", "All next steps")
    .option("-y, --year <year>", "pre-select a year")
    .option("-r, --raw", "output the raw data")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  all?: boolean;
  next?: boolean;
  year?: string;
  raw?: boolean;
}

async function action(id: string | undefined, options: CommandOptions) {
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
        "Project ID": step.pro_id,
        Type: step.psp_type,
        "Limit Date": formatLongDate(step.psp_limit_date),
        "Project Name": step.pro_name,
        Course: step.course_name,
      })),
    );

    return;
  }

  const project = await getProject(id, options);

  const print = (name: string, value: string | number) => {
    console.log(`${styleText("cyan", name.padEnd(13, " "))}${value}`);
  };

  print("ID", project.project_id);
  print("Project Name", project.name);

  project.steps
    .filter((step) => step.pro_id === project.project_id)
    .filter((step) => !options.next || step.psp_limit_date >= Date.now())
    .forEach((step) => {
      console.log("");

      print("Limit Date", formatLongDate(step.psp_limit_date));
      print("Type", step.psp_type);
      print("Description", step.psp_desc.trim());
    });
}
