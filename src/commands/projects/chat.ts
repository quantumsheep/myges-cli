import { styleText } from "node:util";
import type { Command } from "commander";
import readline from "readline";
import type { GlobalCommandOptions } from "#src/commands-base.js";
import { errorHandler, printError } from "#src/commands-base.js";
import * as configurator from "#src/config.js";
import { GesAPI } from "#src/ges-api.js";
import type { ProjectGroupMessage } from "#src/interfaces/api.interface.js";
import { getProject } from "#src/commands/projects/show.js";

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
    const date = new Date(message.date);
    const date_str = `${date.getDate().toString().padStart(2, "0")}/${date
      .getMonth()
      .toString()
      .padStart(2, "0")}/${date.getFullYear()} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

    let prefix = "";

    if (message.uid === uid) {
      prefix = styleText("gray", `[${date_str}] You`);
    } else {
      prefix = styleText("cyan", `[${date_str}] ${message.firstname} ${message.name}`);
    }

    console.log(`${prefix}${styleText("gray", ":")} ${message.message}`);
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
