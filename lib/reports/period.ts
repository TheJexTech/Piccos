import { getBusinessTodayDateStr, getWeekRange } from "@/lib/dashboard/timezone";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";

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
    searchParams.period === "weekly" ||
    searchParams.period === "monthly" ||
    searchParams.period === "custom"
      ? searchParams.period
      : "daily";

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
