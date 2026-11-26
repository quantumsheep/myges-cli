import { styleText } from "node:util";
import type { Command } from "commander";
import readline from "readline";
import type { GlobalCommandOptions } from "@/commands-base.js";
import { errorHandler, printError } from "@/commands-base.js";
import * as configurator from "@/config.js";
import { formatDateTime } from "@/dates.js";
import { GesAPI } from "@/ges-api.js";
import type { ProjectGroupMessage } from "@/interfaces/api.interface.js";
import { getProject } from "@/commands/projects/show.js";

export function register(program: Command) {
  program
    .command("chat [id]")
    .option("-y, --year <year>", "pre-select a year")
    .action(errorHandler(action));
}

interface CommandOptions extends GlobalCommandOptions {
  group?: string;
  year?: string;
}

async function action(id: string | undefined, options: CommandOptions) {
  const config = await configurator.load(true);
  const api = new GesAPI(config);

  const project = await getProject(id, options);

  const { uid } = await api.getProfile();

  const group = project.groups.find(
    (group) => !!(group.project_group_students ?? []).find((student) => student.u_id === uid),
  );

  if (!group) {
    throw new Error("You are not actually in a group.");
  }

  const groupId = group.project_group_id;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.once("SIGINT", () => {
    process.exit(0);
  });

  const messages = await api.getProjectGroupMessages(groupId);

  function display_message(message: ProjectGroupMessage) {
    console.log(formatMessage(message, uid));
  }

  messages.forEach(display_message);

  let timer: NodeJS.Timeout | null = null;

  async function update_messages() {
    if (timer) {
      clearTimeout(timer);
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    const data = await api.getProjectGroupMessages(groupId);
    const new_messages = data.slice(messages.length);

    for (const message of new_messages) {
      display_message(message);
      messages.push(message);
    }

    timer = setTimeout(() => void update_messages(), 20000);
    rl.prompt();
  }

  async function send_message(message: string) {
    try {
      await api.sendProjectGroupMessage(groupId, message);
      await update_messages();
    } catch (e) {
      printError(e, options.debug);

      rl.prompt();
    }
  }

  rl.on("line", (message) => void send_message(message));

  await update_messages();
}

/** "[04/09/1986, 20:30] Firstname Name: message", or "You" for the user's own messages. */
export function formatMessage(message: ProjectGroupMessage, uid: number) {
  const date = formatDateTime(message.date);
  const prefix =
    message.uid === uid
      ? styleText("gray", `[${date}] You`)
      : styleText("cyan", `[${date}] ${message.firstname} ${message.name}`);

  return `${prefix}${styleText("gray", ":")} ${message.message}`;
}
