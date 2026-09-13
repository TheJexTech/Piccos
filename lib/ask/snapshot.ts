// Builds the deterministic JSON snapshot that Ask Piccos hands to Claude.
// All queries run through the caller's own (RLS-scoped) Supabase client, so
// a barber's snapshot naturally contains only their own transactions with
// zero special-casing here — the database enforces it the same way it does
// everywhere else in the app.

import type { createClient } from "@/lib/supabase/server";
import { getBusinessDateRanges, getWeekRange, localDateRangeToUTC } from "@/lib/dashboard/timezone";
import { sum, groupSum } from "@/lib/dashboard/aggregate";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type TxRow = { amount: number; staff: { display_name: string } | null; service_name: string };
type ExpenseRow = {
  amount: number;
  description: string | null;
  expense_categories: { name: string } | null;
};

export type BusinessSnapshot = {
  currency: string;
  today: { revenue: number; expenses: number; profit: number };
  thisWeek: { revenue: number; expenses: number; profit: number };
  thisMonth: { revenue: number; expenses: number; profit: number };
  lastMonth: { revenue: number; expenses: number; profit: number };
  revenueByBarberThisMonth: { label: string; total: number }[];
  revenueByServiceThisMonth: { label: string; total: number }[];
  expenseBreakdownThisMonth: { label: string; total: number }[];
  largestExpensesThisMonth: { description: string; category: string; amount: number }[];
};

// Last calendar month's "YYYY-MM-DD" bounds, derived from this month's
// start date string — mirrors the pure calendar-math style already used by
// getWeekRange/resolveReportPeriod (no date library needed).
function lastMonthDateRange(startOfMonthDateStr: string): { start: string; end: string } {
  const [y, m] = startOfMonthDateStr.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${prevYear}-${pad(prevMonth)}-01`,
    end: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

export async function buildBusinessSnapshot(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string,
  currency: string,
): Promise<BusinessSnapshot> {
  const range = getBusinessDateRanges(timezone);
  const week = getWeekRange(range.todayDateStr);
  const { startUTC: weekStartUTC, endUTC: weekEndUTC } = localDateRangeToUTC(
    timezone,
    week.startDateStr,
    week.endDateStr,
  );
  const lastMonth = lastMonthDateRange(range.startOfMonthDateStr);

  const [
    { data: txToday },
    { data: txWeek },
    { data: txMonth },
    { data: txLastMonth },
    { data: expToday },
    { data: expWeek },
    { data: expMonth },
    { data: expLastMonth },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount")
      .eq("business_id", businessId)
      .gte("transaction_date", range.startOfDay.toISOString())
      .lt("transaction_date", range.startOfNextDay.toISOString()),
    supabase
      .from("transactions")
      .select("amount")
      .eq("business_id", businessId)
      .gte("transaction_date", weekStartUTC.toISOString())
      .lt("transaction_date", weekEndUTC.toISOString()),
    supabase
      .from("transactions")
      .select("amount, staff:staff_id(display_name), service_name")
      .eq("business_id", businessId)
      .gte("transaction_date", range.startOfMonth.toISOString())
      .lt("transaction_date", range.startOfNextMonth.toISOString())
      .returns<TxRow[]>(),
    supabase
      .from("transactions")
      .select("amount")
      .eq("business_id", businessId)
      .gte("transaction_date", range.startOfLastMonth.toISOString())
      .lt("transaction_date", range.startOfMonth.toISOString()),
    supabase.from("expenses").select("amount").eq("business_id", businessId).eq("expense_date", range.todayDateStr),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", businessId)
      .gte("expense_date", week.startDateStr)
      .lte("expense_date", week.endDateStr),
    supabase
      .from("expenses")
      .select("amount, description, expense_categories(name)")
      .eq("business_id", businessId)
      .gte("expense_date", range.startOfMonthDateStr)
      .returns<ExpenseRow[]>(),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", businessId)
      .gte("expense_date", lastMonth.start)
      .lte("expense_date", lastMonth.end),
  ]);

  const revenueToday = sum(txToday);
  const revenueWeek = sum(txWeek);
  const revenueMonth = sum(txMonth);
  const revenueLastMonth = sum(txLastMonth);
  const expensesToday = sum(expToday);
  const expensesWeek = sum(expWeek);
  const expensesMonth = sum(expMonth);
  const expensesLastMonth = sum(expLastMonth);

  const largestExpensesThisMonth = [...(expMonth ?? [])]
    .filter((e) => Number(e.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => ({
      description: e.description ?? "(no description)",
      category: e.expense_categories?.name ?? "Uncategorized",
      amount: Number(e.amount),
    }));

  return {
    currency,
    today: { revenue: revenueToday, expenses: expensesToday, profit: revenueToday - expensesToday },
    thisWeek: { revenue: revenueWeek, expenses: expensesWeek, profit: revenueWeek - expensesWeek },
    thisMonth: { revenue: revenueMonth, expenses: expensesMonth, profit: revenueMonth - expensesMonth },
    lastMonth: {
      revenue: revenueLastMonth,
      expenses: expensesLastMonth,
      profit: revenueLastMonth - expensesLastMonth,
    },
    revenueByBarberThisMonth: groupSum(
      txMonth,
      (t) => t.staff?.display_name ?? "Unassigned",
      (t) => Number(t.amount),
    ),
    revenueByServiceThisMonth: groupSum(
      txMonth,
      (t) => t.service_name,
      (t) => Number(t.amount),
    ),
    expenseBreakdownThisMonth: groupSum(
      expMonth,
      (e) => e.expense_categories?.name ?? "Uncategorized",
      (e) => Number(e.amount),
    ),
    largestExpensesThisMonth,
  };
}
