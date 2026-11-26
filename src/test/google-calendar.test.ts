import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { calendar_v3 } from "googleapis";
import type { GoogleConfig } from "@/google-calendar.js";
import { syncAgenda } from "@/commands/calendar-sync.js";
import { pushToCalendar, syncCalendar } from "@/google-calendar.js";
import type { AgendaItem } from "@/interfaces/agenda.interface.js";

const config = {} as GoogleConfig;
const start = new Date(2026, 0, 5);
const end = new Date(2026, 0, 12);

function agendaItem(name: string): AgendaItem {
  return {
    name,
    rooms: null,
    teacher: null,
    start_date: start.getTime(),
    end_date: start.getTime() + 3600_000,
  } as AgendaItem;
}

interface FakeOptions {
  failInsert?: string;
  failDelete?: string;
  failList?: boolean;
  callMs?: number;
}

/**
 * A fake Google Calendar client that logs each call and takes `callMs` to
 * answer. `existing` holds the pages of existing event ids.
 */
function fakeCalendar(existing: string[] | string[][], options: FakeOptions = {}) {
  const pages = (
    existing.length > 0 && Array.isArray(existing[0]) ? existing : [existing]
  ) as string[][];
  const log: string[] = [];
  const call = async (name: string, fail = false) => {
    log.push(`${name} start`);
    await sleep(options.callMs ?? 20);
    log.push(`${name} end`);
    if (fail) {
      throw new Error(`${name} failed`);
    }
    return { data: {} };
  };
  const calendar = {
    events: {
      list: ({ pageToken }: { pageToken?: string }) => {
        log.push(`list ${pageToken ?? "first"}`);
        if (options.failList) {
          return Promise.reject(new Error("list failed"));
        }
        const page = Number(pageToken ?? 0);
        const nextPageToken = page + 1 < pages.length ? String(page + 1) : undefined;
        return Promise.resolve({
          data: { items: pages[page].map((id) => ({ id })), nextPageToken },
        });
      },
      delete: ({ eventId }: { eventId: string }) =>
        call(`delete ${eventId}`, eventId === options.failDelete),
      insert: ({ requestBody }: { requestBody: { summary: string } }) =>
        call(`insert ${requestBody.summary}`, requestBody.summary === options.failInsert),
    },
  } as unknown as calendar_v3.Calendar;
  return { calendar, log };
}

function ended(log: string[], prefix: string) {
  return log.filter((line) => line.startsWith(prefix) && line.endsWith(" end")).sort();
}

test("pushToCalendar resolves only after every insert has finished", async () => {
  const { calendar, log } = fakeCalendar([]);

  const failures = await pushToCalendar(
    [agendaItem("a"), agendaItem("b"), agendaItem("c")],
    "cal",
    config,
    calendar,
    0,
  );

  assert.equal(failures, 0);
  assert.deepEqual(log.filter((line) => line.endsWith(" end")).sort(), [
    "insert a end",
    "insert b end",
    "insert c end",
  ]);
});

test("syncCalendar removes every old event before the first insert", async () => {
  const { calendar, log } = fakeCalendar(["old1", "old2"]);

  const failures = await syncCalendar(
    [agendaItem("a"), agendaItem("b")],
    start,
    end,
    "cal",
    config,
    calendar,
    0,
  );

  assert.equal(failures, 0);
  const firstInsert = log.findIndex((line) => line.startsWith("insert"));
  const lastDelete = log.findLastIndex((line) => line.startsWith("delete"));
  assert.ok(firstInsert > 0, log.join(", "));
  assert.ok(lastDelete < firstInsert, log.join(", "));
  assert.equal(log.filter((line) => line.startsWith("delete") && line.endsWith(" end")).length, 2);
});

test("a failed insert is counted and the other inserts still run", async () => {
  const { calendar, log } = fakeCalendar(["old"], { failInsert: "b" });

  const failures = await syncCalendar(
    [agendaItem("a"), agendaItem("b"), agendaItem("c")],
    start,
    end,
    "cal",
    config,
    calendar,
    0,
  );

  assert.equal(failures, 1);
  assert.deepEqual(
    log.filter((line) => line.startsWith("insert") && line.endsWith(" end")).sort(),
    ["insert a end", "insert b end", "insert c end"],
  );
});

test("a failed events.list rejects the sync before any delete or insert", async () => {
  const { calendar, log } = fakeCalendar(["old"], { failList: true });

  await assert.rejects(
    syncCalendar([agendaItem("a")], start, end, "cal", config, calendar, 0),
    /list failed/,
  );

  assert.deepEqual(log, ["list first"]);
});

test("calendar-sync sets the exit code to 1 when the sync fails", async () => {
  const { calendar, log } = fakeCalendar([], { failList: true });

  try {
    await syncAgenda([agendaItem("a")], start, end, "cal", config, calendar);
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = 0;
  }
  assert.equal(log.filter((line) => line.startsWith("insert")).length, 0);
});

test("an empty agenda removes the old events and inserts nothing", async () => {
  const { calendar, log } = fakeCalendar(["old1", "old2"]);

  assert.equal(await syncCalendar([], start, end, "cal", config, calendar, 0), 0);

  assert.deepEqual(ended(log, "delete"), ["delete old1 end", "delete old2 end"]);
  assert.equal(log.filter((line) => line.startsWith("insert")).length, 0);
});

test("a failed delete is counted and the inserts still run", async () => {
  const { calendar, log } = fakeCalendar(["old1", "old2"], { failDelete: "old1" });

  assert.equal(await syncCalendar([agendaItem("a")], start, end, "cal", config, calendar, 0), 1);

  assert.deepEqual(ended(log, "delete"), ["delete old1 end", "delete old2 end"]);
  assert.deepEqual(ended(log, "insert"), ["insert a end"]);
});

test("the old events are read from every page", async () => {
  const { calendar, log } = fakeCalendar([["old1", "old2"], ["old3"]]);

  assert.equal(await syncCalendar([], start, end, "cal", config, calendar, 0), 0);

  assert.deepEqual(
    log.filter((line) => line.startsWith("list")),
    ["list first", "list 1"],
  );
  assert.deepEqual(ended(log, "delete"), ["delete old1 end", "delete old2 end", "delete old3 end"]);
});
