import { readFileSync } from "node:fs";

/** The package.json of this package (one level above dist/ and src/). */
export const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string; version: string };
