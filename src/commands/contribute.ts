import { styleText } from "node:util";
import type { Command } from "commander";
import { errorHandler } from "../commands-base.js";
import * as display from "../display.js";

export function register(program: Command) {
  program.command("contribute").description("show useful links").action(errorHandler(action));
}

function action() {
  display.table(
    [
      {
        Name: styleText("cyan", "Réseau GES (GHG Network)"),
        Value: "http://www.reseau-ges.fr",
      },
      {
        Name: styleText("cyan", "GitHub repository"),
        Value: "https://github.com/quantumsheep/myges-cli",
      },
      {
        Name: styleText("cyan", "Issues"),
        Value: "https://github.com/quantumsheep/myges-cli/issues",
      },
    ],
    false,
  );
}
