import type { Command } from "commander";
import * as absencesCommand from "#src/commands/absences.js";
import * as agendaCommand from "#src/commands/agenda.js";
import * as calendarCommand from "#src/commands/calendar-sync.js";
import * as contributeCommand from "#src/commands/contribute.js";
import * as coursesCommand from "#src/commands/courses.js";
import * as gradesCommand from "#src/commands/grades.js";
import * as loginCommand from "#src/commands/login.js";
import * as logoutCommand from "#src/commands/logout.js";
import * as projectsCommand from "#src/commands/projects/index.js";
import * as requestCommand from "#src/commands/request.js";

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
