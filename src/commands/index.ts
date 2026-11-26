import type { Command } from "commander";
import * as absencesCommand from "@/commands/absences.js";
import * as agendaCommand from "@/commands/agenda.js";
import * as calendarCommand from "@/commands/calendar-sync.js";
import * as contributeCommand from "@/commands/contribute.js";
import * as coursesCommand from "@/commands/courses.js";
import * as gradesCommand from "@/commands/grades.js";
import * as loginCommand from "@/commands/login.js";
import * as logoutCommand from "@/commands/logout.js";
import * as projectsCommand from "@/commands/projects/index.js";
import * as requestCommand from "@/commands/request.js";

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
