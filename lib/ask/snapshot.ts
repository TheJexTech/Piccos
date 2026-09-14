// Builds the deterministic JSON snapshot that Ask Piccos hands to Claude.
// All queries run through the caller's own (RLS-scoped) Supabase client, so
// a barber's snapshot naturally contains only their own transactions/batches
// with zero special-casing here — the database enforces it the same way it
// does everywhere else in the app.
//
// Revenue figures go through the same getRevenueSummary() helper Dashboard,
// Revenue, and Reports use, so Ask Piccos can't drift out of sync with them
// once batch activity exists alongside individual transactions.

import type { createClient } from "@/lib/supabase/server";
import { localDateRangeToUTC } from "@/lib/dashboard/timezone";
import { sum, groupSum } from "@/lib/dashboard/aggregate";
import { resolveReportPeriod } from "@/lib/reports/period";
import { getRevenueSummary, type RevenueDateRange } from "@/lib/revenue/aggregate";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ExpenseRow = {
  amount: number;
  description: string | null;
  expense_categories: { name: string } | null;
};

type PeriodFigures = { revenue: number; tips: number; expenses: number; profit: number };

export type BusinessSnapshot = {
  currency: string;
  today: PeriodFigures;
  thisWeek: PeriodFigures;
  thisMonth: PeriodFigures;
  lastMonth: PeriodFigures;
  revenueByBarberThisMonth: { label: string; total: number }[];
  revenueByServiceThisMonth: { label: string; total: number }[];
  tipsByStaffThisMonth: { label: string; total: number }[];
  expenseBreakdownThisMonth: { label: string; total: number }[];
  largestExpensesThisMonth: { description: string; category: string; amount: number }[];
};

function toRange(timezone: string, startDateStr: string, endDateStr: string): RevenueDateRange {
  const { startUTC, endUTC } = localDateRangeToUTC(timezone, startDateStr, endDateStr);
  return { startUTC, endUTC, startDateStr, endDateStr };
}

async function expensesTotal(
  supabase: SupabaseClient,
  businessId: string,
  startDateStr: string,
  endDateStr: string,
): Promise<number> {
  const { data } = await supabase
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .gte("expense_date", startDateStr)
    .lte("expense_date", endDateStr);
  return sum(data);
}

export async function buildBusinessSnapshot(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string,
  currency: string,
): Promise<BusinessSnapshot> {
  const todayPeriod = resolveReportPeriod(timezone, {});
  const weekPeriod = resolveReportPeriod(timezone, { period: "weekly" });
  const monthPeriod = resolveReportPeriod(timezone, { period: "monthly" });
  const lastMonthPeriod = resolveReportPeriod(timezone, { period: "last_month" });

  const [todaySummary, weekSummary, monthSummary, lastMonthSummary, expToday, expWeek, expMonth, expLastMonth, { data: expMonthDetail }] =
    await Promise.all([
      getRevenueSummary(supabase, businessId, toRange(timezone, todayPeriod.startDateStr, todayPeriod.endDateStr)),
      getRevenueSummary(supabase, businessId, toRange(timezone, weekPeriod.startDateStr, weekPeriod.endDateStr)),
      getRevenueSummary(supabase, businessId, toRange(timezone, monthPeriod.startDateStr, monthPeriod.endDateStr)),
      getRevenueSummary(supabase, businessId, toRange(timezone, lastMonthPeriod.startDateStr, lastMonthPeriod.endDateStr)),
      expensesTotal(supabase, businessId, todayPeriod.startDateStr, todayPeriod.endDateStr),
      expensesTotal(supabase, businessId, weekPeriod.startDateStr, weekPeriod.endDateStr),
      expensesTotal(supabase, businessId, monthPeriod.startDateStr, monthPeriod.endDateStr),
      expensesTotal(supabase, businessId, lastMonthPeriod.startDateStr, lastMonthPeriod.endDateStr),
      supabase
        .from("expenses")
        .select("amount, description, expense_categories(name)")
        .eq("business_id", businessId)
        .gte("expense_date", monthPeriod.startDateStr)
        .lte("expense_date", monthPeriod.endDateStr)
        .returns<ExpenseRow[]>(),
    ]);

  const largestExpensesThisMonth = [...(expMonthDetail ?? [])]
    .filter((e) => Number(e.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => ({
      description: e.description ?? "(no description)",
      category: e.expense_categories?.name ?? "Uncategorized",
      amount: Number(e.amount),
    }));

  const figures = (revSummary: Awaited<ReturnType<typeof getRevenueSummary>>, expenses: number): PeriodFigures => ({
    revenue: revSummary.serviceRevenue,
    tips: revSummary.tips,
    expenses,
    profit: revSummary.serviceRevenue - expenses,
  });

  return {
    currency,
    today: figures(todaySummary, expToday),
    thisWeek: figures(weekSummary, expWeek),
    thisMonth: figures(monthSummary, expMonth),
    lastMonth: figures(lastMonthSummary, expLastMonth),
    revenueByBarberThisMonth: monthSummary.revenueByStaff,
    revenueByServiceThisMonth: monthSummary.revenueByService,
    tipsByStaffThisMonth: monthSummary.tipsByStaff,
    expenseBreakdownThisMonth: groupSum(
      expMonthDetail,
      (e) => e.expense_categories?.name ?? "Uncategorized",
      (e) => Number(e.amount),
    ),
    largestExpensesThisMonth,
  };
}
