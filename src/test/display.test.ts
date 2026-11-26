import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import * as display from "@/display.js";

let output: string;
const write = process.stdout.write.bind(process.stdout);

beforeEach(() => {
  output = "";
  process.stdout.write = (chunk: string) => {
    output += chunk;
    return true;
  };
});

afterEach(() => {
  process.stdout.write = write;
  delete process.env.FORCE_COLOR;
  delete process.env.NO_COLOR;
});

test("table() pads the columns to the longest key or value", () => {
  process.env.NO_COLOR = "1";

  display.table([
    { a: 1, bb: "x" },
    { a: "long", bb: null },
  ]);

  // null counts as 4 characters in the width but is printed as ''
  assert.equal(output, "a      bb     \n1      x      \nlong          \n\n");
});

test("table() without keys only prints the rows", () => {
  display.table([{ Name: "n", Value: "v" }], false);

  assert.equal(output, "n      v       \n\n");
});

test("table() colors the header in cyan when colors are enabled", () => {
  process.env.FORCE_COLOR = "1";

  display.table([{ a: 1 }]);

  assert.ok(output.startsWith("\u001b[36ma\u001b[39m"), output);
});

test("multiple() aligns the columns of all the tables", () => {
  process.env.NO_COLOR = "1";

  display.multiple([[{ a: "x" }], [{ a: "long" }]], false);

  assert.equal(output, "x      \n\nlong   \n\n");
});
