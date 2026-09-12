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
