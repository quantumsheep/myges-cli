import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../cli.js", import.meta.url));
let home: string;

before(async () => {
  home = await mkdtemp(path.join(tmpdir(), "myges-cli-test-"));
});

after(async () => {
  await rm(home, { recursive: true, force: true });
});

function myges(...args: string[]) {
  return run(process.execPath, [cli, ...args], {
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, ".config"),
      NO_UPDATE_NOTIFIER: "1",
      NO_COLOR: "1",
    },
  });
}

test("--help lists the commands", async () => {
  const { stdout } = await myges("--help");

  assert.match(stdout, /Usage: /);
  for (const command of ["agenda", "grades", "projects", "request"]) {
    assert.match(stdout, new RegExp(`\\b${command}\\b`));
  }
});

test("--version prints the package version", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version: string };

  const { stdout } = await myges("--version");

  assert.equal(stdout.trim(), pkg.version);
});

test("an unknown command shows the help instead of failing", async () => {
  const { stdout } = await myges("nosuch");

  assert.match(stdout, /Usage: /);
});

test("contribute prints the useful links", async () => {
  const { stdout } = await myges("contribute");

  assert.match(stdout, /https:\/\/github\.com\/quantumsheep\/myges-cli/);
});
