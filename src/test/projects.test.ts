import assert from "node:assert/strict";
import { test } from "node:test";
import { Command } from "commander";
import { formatMessage } from "@/commands/projects/chat.js";
import * as join from "@/commands/projects/join.js";
import type { ProjectGroup } from "@/interfaces/project.interface.js";

test("projects join -g takes the group number", async () => {
  const program = new Command();
  join.register(program);
  let parsed: unknown[] = [];
  program.commands[0].action((...args: unknown[]) => {
    parsed = args.slice(0, 2);
  });

  await program.parseAsync(["join", "123", "-g", "2"], { from: "user" });

  assert.deepEqual(parsed, ["123", { group: "2" }]);
});

test("projects join looks up the group by its id, not by its position", () => {
  const groups = [5, 2, 3].map((id) => ({ project_group_id: id }) as ProjectGroup);

  assert.equal(join.findGroup(groups, "3")?.project_group_id, 3);
  assert.equal(join.findGroup(groups, "2")?.project_group_id, 2);
  assert.equal(join.findGroup(groups, "5")?.project_group_id, 5);
  assert.equal(join.findGroup(groups, "1"), undefined);
  assert.equal(join.findGroup(groups, "abc"), undefined);
});

test("chat messages show the date with the right month", () => {
  const message = {
    uid: 1,
    date: new Date(1986, 8, 4, 20, 30).getTime(),
    firstname: "Ada",
    name: "Lovelace",
    message: "hello",
  };

  assert.equal(formatMessage(message, 2), "[04/09/1986, 20:30] Ada Lovelace: hello");
  assert.equal(formatMessage(message, 1), "[04/09/1986, 20:30] You: hello");
});
