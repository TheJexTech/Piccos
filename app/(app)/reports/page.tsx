import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { getBusinessOutlets, resolveOutletId } from "@/lib/business/outlets";
import { localDateRangeToUTC } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/dashboard/format";
import { sum, groupSum } from "@/lib/dashboard/aggregate";
import { resolveReportPeriod } from "@/lib/reports/period";
import { getRevenueSummary, getRevenueTrend } from "@/lib/revenue/aggregate";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { BreakdownBars, TrendChart } from "@/components/ui/chart";
import { TransactionsList } from "@/components/transactions-list";
import { PeriodFilter } from "./period-filter";
import { BatchList } from "../activity/batch-list";
import { ProductSalesList } from "../products/product-sales-list";
import type { Transaction } from "@/lib/transactions/types";
import type { Expense } from "@/lib/expenses/types";
import type { Batch } from "@/lib/batches/types";
import type { ProductSale } from "@/lib/products/types";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    date?: string;
    month?: string;
    start?: string;
    end?: string;
    outlet?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const canAccess = membership.role === "owner" || membership.role === "secretary";
  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-4 text-sm text-muted">Only the owner and secretary can view reports.</p>
      </div>
    );
  }

  const businessId = membership.businessId;
  const isOwner = membership.role === "owner";

  // Same outlet source as everywhere else (Dashboard/Staff/Products) — this
  // business's stations. No explicit ?outlet= means "All Outlets" combined.
  const outlets = await getBusinessOutlets(supabase, businessId);
  const selectedOutlet = resolveOutletId(params.outlet, outlets);
  const stationId = selectedOutlet === "all" ? undefined : selectedOutlet;
  const viewingOutletName =
    selectedOutlet === "all" ? "All Outlets" : outlets.find((o) => o.id === selectedOutlet)?.name ?? null;

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
  const range = { startUTC, endUTC, startDateStr: resolved.startDateStr, endDateStr: resolved.endDateStr };

  let transactionsQuery = supabase
    .from("transactions")
    .select(
      "id, transaction_date, amount, payment_method, service_name, correction_of_id, tip_amount, tip_payment_method, staff:staff_id(display_name), stations:station_id(name)",
    )
    .eq("business_id", businessId)
    .gte("transaction_date", startUTC.toISOString())
    .lt("transaction_date", endUTC.toISOString())
    .order("transaction_date", { ascending: false });
  let expensesQuery = supabase
    .from("expenses")
    .select("id, amount, description, expense_date, correction_of_id, expense_categories(name)")
    .eq("business_id", businessId)
    .gte("expense_date", resolved.startDateStr)
    .lte("expense_date", resolved.endDateStr)
    .order("expense_date", { ascending: false });
  let batchesQuery = supabase
    .from("batches")
    .select(
      "id, batch_date, tip_amount, status, staff:staff_id(display_name), batch_services(service_name, quantity, line_total)",
    )
    .eq("business_id", businessId)
    .gte("batch_date", resolved.startDateStr)
    .lte("batch_date", resolved.endDateStr)
    .order("batch_date", { ascending: false });
  let productSalesQuery = supabase
    .from("product_sales")
    .select(
      "id, product_name, selling_price, cost_price, quantity, amount, payment_method, sale_date, correction_of_id",
    )
    .eq("business_id", businessId)
    .gte("sale_date", startUTC.toISOString())
    .lt("sale_date", endUTC.toISOString())
    .order("sale_date", { ascending: false });

  if (stationId) {
    transactionsQuery = transactionsQuery.eq("station_id", stationId);
    expensesQuery = expensesQuery.eq("station_id", stationId);
    batchesQuery = batchesQuery.eq("station_id", stationId);
    productSalesQuery = productSalesQuery.eq("station_id", stationId);
  }

  const [summary, trend, { data: transactions }, { data: expenses }, { data: batches }, { data: productSales }] =
    await Promise.all([
      getRevenueSummary(supabase, businessId, range, stationId),
      getRevenueTrend(supabase, businessId, timezone, range, stationId),
      transactionsQuery.returns<Transaction[]>(),
      expensesQuery.returns<Expense[]>(),
      batchesQuery.returns<Batch[]>(),
      productSalesQuery.returns<ProductSale[]>(),
    ]);

  const expenseTotal = sum(expenses);
  // Revenue here means total revenue (service + product) — profit accounts
  // for both cost categories: operating expenses and product cost of goods
  // sold, each pulled from its own table and summed once.
  const profit = summary.totalRevenue - expenseTotal - summary.productCOGS;

  const categoryTotals = groupSum(
    expenses,
    (e) => e.expense_categories?.name ?? "Uncategorized",
    (e) => Number(e.amount),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Reports</h1>
      <p className="mt-1 text-sm text-muted">
        {viewingOutletName ? `${viewingOutletName} · ` : ""}
        {resolved.label}
      </p>

      <div className="mt-6">
        <PeriodFilter resolved={resolved} outlets={outlets} selectedOutlet={selectedOutlet} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Revenue"
          value={money(summary.totalRevenue)}
          sublabel={`${money(summary.serviceRevenue)} service + ${money(summary.productRevenue)} product`}
        />
        <MetricCard label="Expenses" value={money(expenseTotal)} />
        <MetricCard label="Est. profit" value={money(profit)} />
      </div>

      <div className="mt-6">
        <SectionCard title="Revenue trend">
          <TrendChart data={trend.map((t) => ({ label: t.label, value: t.total }))} formatValue={money} />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue by barber">
          <BreakdownBars data={summary.revenueByStaff} formatValue={money} emptyMessage="No revenue in this period." />
        </SectionCard>
        <SectionCard title="Revenue by service">
          <BreakdownBars data={summary.revenueByService} formatValue={money} emptyMessage="No revenue in this period." />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue by product">
          <BreakdownBars
            data={summary.revenueByProduct}
            formatValue={money}
            emptyMessage="No product sales in this period."
          />
        </SectionCard>
        <SectionCard title="Expense breakdown">
          <BreakdownBars data={categoryTotals} formatValue={money} emptyMessage="No expenses in this period." />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Historical activity">
          <TransactionsList transactions={transactions ?? []} emptyMessage="No activity in this period." />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Batch entries">
          <BatchList batches={batches ?? []} isOwner={isOwner} />
        </SectionCard>
      </div>

      <div className="mt-6">
        <ProductSalesList sales={productSales ?? []} isOwner={isOwner} />
      </div>

      <p className="mt-6 text-xs text-muted">
        Estimated profit = service revenue + product sales − operating expenses − product cost of
        goods sold. Tips are never included in revenue or profit. Not a formal accounting figure.
      </p>
    </div>
  );
}
