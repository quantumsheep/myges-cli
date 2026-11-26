import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

// The config path is computed from the home directory at import time.
const home = await mkdtemp(path.join(tmpdir(), "myges-config-test-"));
process.env.HOME = home;
process.env.USERPROFILE = home;

const configurator = await import("@/config.js");
const configPath = path.join(home, ".myges");

before(async () => {
  await rm(configPath, { force: true });
});

after(async () => {
  await rm(home, { recursive: true, force: true });
});

test("load() without a config file returns empty credentials", async () => {
  assert.deepEqual(await configurator.load(), {
    access_token: null,
    token_type: null,
  });
});

test("save() writes ~/.myges and load() reads it back", async () => {
  const config = {
    username: "student",
    access_token: "token",
    token_type: "bearer",
    expires: Date.now() + 60_000,
  };

  await configurator.save(config);

  assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), config);
  assert.deepEqual(await configurator.loadAll(), config);
  assert.deepEqual(await configurator.load(true), {
    access_token: "token",
    token_type: "bearer",
  });
});

test("erase() empties the config", async () => {
  await configurator.erase();

  assert.equal(await readFile(configPath, "utf8"), "{}");
  assert.deepEqual(await configurator.load(), {
    access_token: null,
    token_type: null,
  });
});
