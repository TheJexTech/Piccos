import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessDateRanges } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/dashboard/format";
import { sum, groupSum } from "@/lib/dashboard/aggregate";
import { StatCard } from "@/components/stat-card";
import { TotalsList } from "@/components/totals-list";

type TxRow = { amount: number; staff: { display_name: string } | null };
type ExpenseRow = { amount: number; expense_categories: { name: string } | null };

export default async function DashboardPage() {
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

  const businessId = membership.business_id;
  const canSeeFullDashboard = membership.role === "owner" || membership.role === "secretary";

  const { data: business } = await supabase
    .from("businesses")
    .select("timezone, currency")
    .eq("id", businessId)
    .single();

  const timezone = business?.timezone ?? "Africa/Lagos";
  const currency = business?.currency ?? "NGN";
  const range = getBusinessDateRanges(timezone);
  const money = (n: number) => formatMoney(n, currency);

  if (!canSeeFullDashboard) {
    // Barber: RLS only returns their own transactions, and none of the
    // expense data — a full owner-style dashboard would just render
    // empty/misleading sections, so show a narrower view instead.
    const [{ data: myTxToday }, { data: myTxMonth }] = await Promise.all([
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
        .gte("transaction_date", range.startOfMonth.toISOString())
        .lt("transaction_date", range.startOfNextMonth.toISOString()),
    ]);

    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Your performance</h1>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatCard label="Revenue today" value={money(sum(myTxToday))} />
          <StatCard label="Revenue this month" value={money(sum(myTxMonth))} />
        </div>
      </div>
    );
  }

  const [{ data: txToday }, { data: txMonth }, { data: txLastMonth }, { data: expToday }, { data: expMonth }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount, staff:staff_id(display_name)")
        .eq("business_id", businessId)
        .gte("transaction_date", range.startOfDay.toISOString())
        .lt("transaction_date", range.startOfNextDay.toISOString())
        .returns<TxRow[]>(),
      supabase
        .from("transactions")
        .select("amount, staff:staff_id(display_name)")
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
      supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", businessId)
        .eq("expense_date", range.todayDateStr),
      supabase
        .from("expenses")
        .select("amount, expense_categories(name)")
        .eq("business_id", businessId)
        .gte("expense_date", range.startOfMonthDateStr)
        .returns<ExpenseRow[]>(),
    ]);

  const revenueToday = sum(txToday);
  const revenueMonth = sum(txMonth);
  const revenueLastMonth = sum(txLastMonth);
  const expensesToday = sum(expToday);
  const expensesMonth = sum(expMonth);

  const profitToday = revenueToday - expensesToday;
  const profitMonth = revenueMonth - expensesMonth;

  const barberTotals = groupSum(
    txMonth,
    (t) => t.staff?.display_name ?? "Unassigned",
    (t) => Number(t.amount),
  );
  const categoryTotals = groupSum(
    expMonth,
    (e) => e.expense_categories?.name ?? "Uncategorized",
    (e) => Number(e.amount),
  );

  const revenueTrendPct =
    revenueLastMonth > 0 ? ((revenueMonth - revenueLastMonth) / revenueLastMonth) * 100 : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Dashboard</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Revenue today" value={money(revenueToday)} />
        <StatCard label="Expenses today" value={money(expensesToday)} />
        <StatCard label="Est. profit today" value={money(profitToday)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatCard label="Revenue this month" value={money(revenueMonth)} />
        <StatCard label="Expenses this month" value={money(expensesMonth)} />
        <StatCard label="Est. profit this month" value={money(profitMonth)} />
      </div>

      {revenueTrendPct !== null && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Revenue is {revenueTrendPct >= 0 ? "up" : "down"} {Math.abs(revenueTrendPct).toFixed(0)}%
          vs last month.
        </p>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8">
        <TotalsList
          title="Barber performance (this month)"
          emptyMessage="No transactions yet this month."
          totals={barberTotals.map((t) => ({ label: t.label, formattedTotal: money(t.total) }))}
        />
        <TotalsList
          title="Expense breakdown (this month)"
          emptyMessage="No expenses recorded this month."
          totals={categoryTotals.map((t) => ({ label: t.label, formattedTotal: money(t.total) }))}
        />
      </div>

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
        Estimated operating profit = recorded service revenue − recorded operating expenses. Not a
        formal accounting figure.
      </p>
    </div>
  );
}
