import {
  addDays,
  format,
  getDay,
  isValid,
  setDate,
  setHours,
  setMonth,
  setYear,
  subDays,
} from "date-fns";

// Formats match the moment.js "en" formats used before.
const TIME_FORMAT = "h:mm a"; // moment "LT"
const TIME_LENGTH = format(new Date(2000, 0, 1, 11, 30), TIME_FORMAT).length;

/** "04-09-1986" */
export function formatDay(date: Date | number) {
  return format(date, "dd-MM-yyyy");
}

/** "September 4, 1986" (moment "LL") */
export function formatLongDate(date: Date | number) {
  return format(date, "MMMM d, yyyy");
}

/** "Thu, September 4, 1986" (moment "ddd, LL") */
export function formatWeekdayDate(date: Date | number) {
  return format(date, "EEE, MMMM d, yyyy");
}

/** "04/09/1986, 20:30" */
export function formatDateTime(date: Date | number) {
  return format(date, "dd/MM/yyyy, HH:mm");
}

/** "08:30 PM": moment "LT", zero-padded to the length of "11:30 AM" */
export function formatTime(date: Date | number) {
  return format(date, TIME_FORMAT).padStart(TIME_LENGTH, "0");
}

/** The Sunday that starts the week of `now`, at 23:xx. */
export function weekMiddle(now: Date) {
  return setHours(subDays(now, getDay(now)), 23);
}

/** "dd-MM-yyyy dd-MM-yyyy" for the 7 days from `start`. */
export function weekRange(start: Date) {
  return `${formatDay(start)} ${formatDay(addDays(start, 7))}`;
}

/**
 * Converts the `agenda [week]` argument to a date range.
 * Accepts today[+n], tomorrow[+n], yesterday[+n], week[+n] and
 * DD[-MM[-YYYY]][+n].
 */
export function agendaRange(week: string, now: Date) {
  let start = setHours(now, 0);
  let end = setHours(now, 23);

  let pass = +(week.split("+")[1] || 0);

  if (week.startsWith("today")) {
    start = addDays(start, pass);
    end = addDays(end, pass);
  } else if (week.startsWith("tomorrow")) {
    start = addDays(start, pass + 1);
    end = addDays(end, pass + 1);
  } else if (week.startsWith("yesterday")) {
    start = subDays(start, pass + 1);
    end = subDays(end, pass + 1);
  } else {
    if (week.startsWith("week")) {
      pass *= 7;
      week = formatDay(now);
    }

    const [date, month = now.getMonth() + 1, year = now.getFullYear()] = week
      .split(/[-+]/g)
      .map((v) => parseInt(v, 10));

    let selected = setYear(now, year);
    selected = setMonth(selected, month - 1);
    selected = setDate(selected, date + pass);
    selected = setHours(selected, 23);

    start = subDays(selected, getDay(selected));
    end = addDays(start, 7);
  }

  if (!isValid(start) || !isValid(end)) {
    throw new Error(`Invalid week: ${week}`);
  }

  return { start, end };
}

/** "Thu Sep 04 1986 at 20:30" */
export function formatPresentationDate(date: Date | number) {
  return `${new Date(date).toDateString()} at ${format(date, "HH:mm")}`;
}
