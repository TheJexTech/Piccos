import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localDateRangeToUTC } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/dashboard/format";
import { sum, groupSum } from "@/lib/dashboard/aggregate";
import { resolveReportPeriod } from "@/lib/reports/period";
import { StatCard } from "@/components/stat-card";
import { TotalsList } from "@/components/totals-list";
import { TransactionsList } from "@/components/transactions-list";
import { PeriodFilter } from "./period-filter";
import type { Transaction } from "@/lib/transactions/types";
import type { Expense } from "@/lib/expenses/types";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    date?: string;
    month?: string;
    start?: string;
    end?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding/business");

  const canAccess = membership.role === "owner" || membership.role === "secretary";
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Reports</h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Only the owner and secretary can view reports.
        </p>
      </div>
    );
  }

  const businessId = membership.business_id;

  const { data: business } = await supabase
    .from("businesses")
    .select("timezone, currency")
    .eq("id", businessId)
    .single();

  const timezone = business?.timezone ?? "Africa/Lagos";
  const currency = business?.currency ?? "NGN";
  const money = (n: number) => formatMoney(n, currency);

  const resolved = resolveReportPeriod(timezone, params);
  const { startUTC, endUTC } = localDateRangeToUTC(
    timezone,
    resolved.startDateStr,
    resolved.endDateStr,
  );

  const [{ data: transactions }, { data: expenses }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, amount, payment_method, service_name, staff:staff_id(display_name), stations:station_id(name)",
      )
      .eq("business_id", businessId)
      .gte("transaction_date", startUTC.toISOString())
      .lt("transaction_date", endUTC.toISOString())
      .order("transaction_date", { ascending: false })
      .returns<Transaction[]>(),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, expense_categories(name)")
      .eq("business_id", businessId)
      .gte("expense_date", resolved.startDateStr)
      .lte("expense_date", resolved.endDateStr)
      .order("expense_date", { ascending: false })
      .returns<Expense[]>(),
  ]);

  const revenue = sum(transactions);
  const expenseTotal = sum(expenses);
  const profit = revenue - expenseTotal;

  const barberTotals = groupSum(
    transactions,
    (t) => t.staff?.display_name ?? "Unassigned",
    (t) => Number(t.amount),
  );
  const serviceTotals = groupSum(
    transactions,
    (t) => t.service_name,
    (t) => Number(t.amount),
  );
  const categoryTotals = groupSum(
    expenses,
    (e) => e.expense_categories?.name ?? "Uncategorized",
    (e) => Number(e.amount),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Reports</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{resolved.label}</p>

      <div className="mt-6">
        <PeriodFilter resolved={resolved} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Revenue" value={money(revenue)} />
        <StatCard label="Expenses" value={money(expenseTotal)} />
        <StatCard label="Est. profit" value={money(profit)} />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-8">
        <TotalsList
          title="Revenue by barber"
          emptyMessage="No transactions in this period."
          totals={barberTotals.map((t) => ({ label: t.label, formattedTotal: money(t.total) }))}
        />
        <TotalsList
          title="Revenue by service"
          emptyMessage="No transactions in this period."
          totals={serviceTotals.map((t) => ({ label: t.label, formattedTotal: money(t.total) }))}
        />
      </div>

      <div className="mt-10">
        <TotalsList
          title="Expense breakdown"
          emptyMessage="No expenses in this period."
          totals={categoryTotals.map((t) => ({ label: t.label, formattedTotal: money(t.total) }))}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-black dark:text-zinc-50">Historical activity</h2>
        <TransactionsList
          transactions={transactions ?? []}
          emptyMessage="No activity in this period."
        />
      </div>

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
        Estimated operating profit = recorded service revenue − recorded operating expenses. Not a
        formal accounting figure.
      </p>
    </div>
  );
}
