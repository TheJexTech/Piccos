import { getBusinessTodayDateStr, getWeekRange, shiftDateStr, getLastMonthRange } from "@/lib/dashboard/timezone";

// "yesterday" and "last_month" are additional presets used by the Revenue
// page (Today/Yesterday/This week/This month/Last month/Custom) — Reports
// keeps its existing daily/weekly/monthly/custom filter UI unchanged, but
// both share this one period-resolution function rather than duplicating
// the date math.
export type ReportPeriod = "daily" | "yesterday" | "weekly" | "monthly" | "last_month" | "custom";

export type ResolvedPeriod = {
  period: ReportPeriod;
  startDateStr: string;
  endDateStr: string;
  label: string;
  // Echoed back so the filter form can keep the right inputs populated.
  dateInput: string;
  monthInput: string;
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function lastDayOfMonth(year: number, month1to12: number): number {
  // Day 0 of "next month" is the last day of this month.
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function resolveReportPeriod(
  timeZone: string,
  searchParams: { period?: string; date?: string; month?: string; start?: string; end?: string },
): ResolvedPeriod {
  const todayStr = getBusinessTodayDateStr(timeZone);
  const period: ReportPeriod =
    searchParams.period === "yesterday" ||
    searchParams.period === "weekly" ||
    searchParams.period === "monthly" ||
    searchParams.period === "last_month" ||
    searchParams.period === "custom"
      ? searchParams.period
      : "daily";

  if (period === "yesterday") {
    const dateStr = shiftDateStr(todayStr, -1);
    return {
      period,
      startDateStr: dateStr,
      endDateStr: dateStr,
      label: formatDate(dateStr),
      dateInput: dateStr,
      monthInput: todayStr.slice(0, 7),
    };
  }

  if (period === "last_month") {
    const { startDateStr, endDateStr } = getLastMonthRange(todayStr);
    return {
      period,
      startDateStr,
      endDateStr,
      label: formatMonth(startDateStr.slice(0, 7)),
      dateInput: todayStr,
      monthInput: startDateStr.slice(0, 7),
    };
  }

  if (period === "weekly") {
    const dateInput = searchParams.date || todayStr;
    const { startDateStr, endDateStr } = getWeekRange(dateInput);
    return {
      period,
      startDateStr,
      endDateStr,
      label: `${formatDate(startDateStr)} – ${formatDate(endDateStr)}`,
      dateInput,
      monthInput: todayStr.slice(0, 7),
    };
  }

  if (period === "monthly") {
    const monthInput = searchParams.month || todayStr.slice(0, 7);
    const [y, m] = monthInput.split("-").map(Number);
    const startDateStr = `${monthInput}-01`;
    const endDateStr = `${monthInput}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;
    return {
      period,
      startDateStr,
      endDateStr,
      label: formatMonth(monthInput),
      dateInput: todayStr,
      monthInput,
    };
  }

  if (period === "custom") {
    const startDateStr = searchParams.start || todayStr;
    const endDateStr = searchParams.end || todayStr;
    return {
      period,
      startDateStr,
      endDateStr,
      label: `${formatDate(startDateStr)} – ${formatDate(endDateStr)}`,
      dateInput: todayStr,
      monthInput: todayStr.slice(0, 7),
    };
  }

  const dateInput = searchParams.date || todayStr;
  return {
    period: "daily",
    startDateStr: dateInput,
    endDateStr: dateInput,
    label: formatDate(dateInput),
    dateInput,
    monthInput: todayStr.slice(0, 7),
  };
}
