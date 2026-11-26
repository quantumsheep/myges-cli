import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agendaRange,
  formatDateTime,
  formatDay,
  formatLongDate,
  formatPresentationDate,
  formatTime,
  formatWeekdayDate,
  weekMiddle,
  weekRange,
} from "../dates.js";

// Local time zone used by the expected values below.
process.env.TZ = "Europe/Paris";

const evening = new Date(1986, 8, 4, 20, 30);
const morning = new Date(1986, 8, 4, 9, 5);

test('date formats match the former moment.js "en" formats', () => {
  assert.equal(formatDay(evening), "04-09-1986");
  assert.equal(formatLongDate(evening), "September 4, 1986"); // LL
  assert.equal(formatWeekdayDate(evening), "Thu, September 4, 1986"); // ddd, LL
  assert.equal(formatDateTime(evening), "04/09/1986, 20:30");
  assert.equal(formatTime(evening), "08:30 PM"); // LT, zero-padded
  assert.equal(formatTime(morning), "09:05 AM");
  assert.equal(formatTime(new Date(1986, 8, 4, 11, 30)), "11:30 AM");
  assert.equal(formatPresentationDate(evening), "Thu Sep 04 1986 at 20:30");
});

test("formatters accept timestamps", () => {
  assert.equal(formatLongDate(evening.getTime()), "September 4, 1986");
});

// Wednesday, November 25th 2026, 14:10:05
const now = new Date(2026, 10, 25, 14, 10, 5);

function range(week: string) {
  const { start, end } = agendaRange(week, now);
  return [start.toString(), end.toString()];
}

test("weekMiddle is the previous Sunday at 23:xx", () => {
  assert.equal(weekMiddle(now).toString(), new Date(2026, 10, 22, 23, 10, 5).toString());
  assert.equal(weekRange(weekMiddle(now)), "22-11-2026 29-11-2026");
});

test("agenda day ranges", () => {
  assert.deepEqual(range("today"), [
    new Date(2026, 10, 25, 0, 10, 5).toString(),
    new Date(2026, 10, 25, 23, 10, 5).toString(),
  ]);
  assert.deepEqual(range("tomorrow+1"), [
    new Date(2026, 10, 27, 0, 10, 5).toString(),
    new Date(2026, 10, 27, 23, 10, 5).toString(),
  ]);
  assert.deepEqual(range("yesterday"), [
    new Date(2026, 10, 24, 0, 10, 5).toString(),
    new Date(2026, 10, 24, 23, 10, 5).toString(),
  ]);
});

test("agenda week ranges start on Sunday and last 7 days", () => {
  const days = (week: string) => {
    const { start, end } = agendaRange(week, now);
    return [formatDay(start), formatDay(end)];
  };

  assert.deepEqual(days("week"), ["22-11-2026", "29-11-2026"]);
  assert.deepEqual(days("week+1"), ["29-11-2026", "06-12-2026"]);
  assert.deepEqual(days("5"), ["01-11-2026", "08-11-2026"]);
  assert.deepEqual(days("15-03-2027"), ["14-03-2027", "21-03-2027"]);
  assert.deepEqual(days("31-12-2026+1"), ["27-12-2026", "03-01-2027"]);
  // Crosses the end of daylight saving time (October 25th 2026)
  assert.deepEqual(days("27-10-2026"), ["25-10-2026", "01-11-2026"]);

  const { start } = agendaRange("15-03-2027", now);
  assert.equal(start.getHours(), 23);
});

test("an invalid week throws", () => {
  assert.throws(() => agendaRange("foo", now), /Invalid week/);
});
