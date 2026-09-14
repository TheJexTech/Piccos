// Pure-JS timezone boundary helpers — no date library needed. We only
// ever need "now"'s offset for the business's configured timezone (never
// an arbitrary historical date), so a full timezone library would be
// more than V1 needs. "Respect the business timezone when presenting
// daily reports" is an explicit V1 data rule — computing "today" from
// server/UTC time would show the wrong day near midnight.

function getTimezoneOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

// Converts any UTC instant to its local calendar date string in the
// business's timezone — the general-purpose version of the offset math
// getBusinessTodayDateStr already does for "now", usable for bucketing
// arbitrary historical rows (e.g. a revenue trend chart) by local day.
export function utcToLocalDateStr(timeZone: string, date: Date): string {
  // en-CA formats as YYYY-MM-DD, matching every other dateStr in this app.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function getBusinessTodayDateStr(timeZone: string, now: Date = new Date()): string {
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, now);
  const localNow = new Date(now.getTime() + offsetMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localNow.getUTCFullYear()}-${pad(localNow.getUTCMonth() + 1)}-${pad(localNow.getUTCDate())}`;
}

// Converts a "YYYY-MM-DD" local calendar date (in the business's
// timezone) plus an inclusive end date into the UTC instants bounding
// that range (end is exclusive, i.e. the start of the day *after*
// endDateStr, so the end date itself is fully included).
//
// Uses "now"'s UTC offset for the conversion rather than the offset at
// the actual historical date. None of V1's supported timezones (Lagos,
// Accra, Nairobi, Cairo, Johannesburg, UTC) currently observe daylight
// saving time, so this is safe for now — it would need revisiting
// before adding a DST-observing timezone to the list.
export function localDateRangeToUTC(
  timeZone: string,
  startDateStr: string,
  endDateStr: string,
  now: Date = new Date(),
): { startUTC: Date; endUTC: Date } {
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, now);
  const toUTC = (dateStr: string, dayOffset: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + dayOffset, 0, 0, 0) - offsetMinutes * 60000);
  };
  return { startUTC: toUTC(startDateStr, 0), endUTC: toUTC(endDateStr, 1) };
}

// Monday–Sunday week containing dateStr. Pure calendar-date arithmetic
// (no timezone offset involved — dateStr is already a local calendar
// date, we're just finding the surrounding week for it).
export function getWeekRange(dateStr: string): { startDateStr: string; endDateStr: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  const dayOfWeek = noon.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(noon);
  monday.setUTCDate(monday.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  return { startDateStr: fmt(monday), endDateStr: fmt(sunday) };
}

// dateStr shifted by deltaDays — pure calendar-date arithmetic, same style
// as getWeekRange (no timezone offset involved, dateStr is already a local
// calendar date).
export function shiftDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// Calendar month immediately before the one containing dateStr.
export function getLastMonthRange(dateStr: string): { startDateStr: string; endDateStr: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDateStr: `${prevYear}-${pad(prevMonth)}-01`,
    endDateStr: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

export function getBusinessDateRanges(timeZone: string, now: Date = new Date()) {
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, now);
  const localNow = new Date(now.getTime() + offsetMinutes * 60000);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();

  const toUTC = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d, 0, 0, 0) - offsetMinutes * 60000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  return {
    startOfDay: toUTC(year, month, day),
    startOfNextDay: toUTC(year, month, day + 1),
    startOfMonth: toUTC(year, month, 1),
    startOfNextMonth: toUTC(year, month + 1, 1),
    startOfLastMonth: toUTC(year, month - 1, 1),
    todayDateStr: dateStr(year, month, day),
    startOfMonthDateStr: dateStr(year, month, 1),
  };
}
