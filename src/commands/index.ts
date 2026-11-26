import type { Command } from "commander";
import * as absencesCommand from "./absences.js";
import * as agendaCommand from "./agenda.js";
import * as calendarCommand from "./calendar-sync.js";
import * as contributeCommand from "./contribute.js";
import * as coursesCommand from "./courses.js";
import * as gradesCommand from "./grades.js";
import * as loginCommand from "./login.js";
import * as logoutCommand from "./logout.js";
import * as projectsCommand from "./projects/index.js";
import * as requestCommand from "./request.js";

export function register(program: Command) {
  absencesCommand.register(program);
  agendaCommand.register(program);
  calendarCommand.register(program);
  contributeCommand.register(program);
  coursesCommand.register(program);
  gradesCommand.register(program);
  loginCommand.register(program);
  logoutCommand.register(program);
  projectsCommand.register(program);
  requestCommand.register(program);
}
