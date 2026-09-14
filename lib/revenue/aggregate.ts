// Combines individual transactions, batch activity, and product sales into
// one revenue picture. This is the one place that decides "what counts as
// revenue" — Dashboard, the Revenue page, Reports, and the Ask Piccos
// snapshot all call this instead of querying transactions/product_sales
// directly, so none of them can drift out of sync with each other or
// accidentally double-count a batch or a voided sale.
//
// Batch revenue is the pre-multiplied `line_total` per batch_services row
// (e.g. "35 Haircuts" is one row with line_total = 157500) — summing it
// once is what makes "must not double-count" true by construction, not by
// a filter someone has to remember to add.
//
// serviceRevenue keeps its original meaning (services only) so every
// existing caller (Ask Piccos snapshot, verify scripts, Reports' by-staff/
// by-service breakdowns) is unaffected — productRevenue/productCOGS/
// totalRevenue are additive fields callers opt into.
//
// revenueByStaff/tipsByStaff group by staff_id internally (never by
// display_name — two staff can share a name, and a rename must not merge
// or split a staff member's history) and only resolve to a display label
// for the final output.

import type { createClient } from "@/lib/supabase/server";
import { sum, groupSum } from "@/lib/dashboard/aggregate";
import { utcToLocalDateStr, shiftDateStr } from "@/lib/dashboard/timezone";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type RevenueDateRange = {
  startUTC: Date;
  endUTC: Date;
  startDateStr: string;
  endDateStr: string;
};

export type RevenueSummary = {
  serviceRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  productCOGS: number;
  tips: number;
  servicesPerformed: number;
  revenueByStaff: { label: string; total: number }[];
  revenueByService: { label: string; total: number }[];
  revenueByProduct: { label: string; total: number }[];
  tipsByStaff: { label: string; total: number }[];
};

const UNASSIGNED = "__unassigned__";

type TransactionRow = {
  amount: number;
  tip_amount: number;
  service_name: string;
  staff_id: string | null;
  staff: { display_name: string } | null;
};

type BatchLineRow = {
  service_name: string;
  line_total: number;
  quantity: number;
  batches: { staff_id: string | null; staff: { display_name: string } | null } | null;
};

type BatchHeaderRow = {
  tip_amount: number;
  staff_id: string | null;
  staff: { display_name: string } | null;
};

type ProductSaleRow = {
  product_name: string;
  amount: number;
  quantity: number;
  cost_price: number;
};

// Merges two {label,total}[] lists (e.g. transactions' revenue-by-staff and
// batches' revenue-by-staff) into one, summing totals for matching labels.
function mergeTotals(
  a: { label: string; total: number }[],
  b: { label: string; total: number }[],
): { label: string; total: number }[] {
  const map = new Map<string, number>();
  for (const { label, total } of [...a, ...b]) {
    map.set(label, (map.get(label) ?? 0) + total);
  }
  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((x, y) => y.total - x.total);
}

// Groups by staff id (never by name — see file header), then resolves each
// group's id back to its current display name for the returned label.
function groupByStaffId<T>(
  rows: T[],
  getStaffId: (row: T) => string | null,
  getStaffName: (row: T) => string | undefined,
  getAmount: (row: T) => number,
): { label: string; total: number }[] {
  const totals = new Map<string, number>();
  const names = new Map<string, string>();
  for (const row of rows) {
    const id = getStaffId(row) ?? UNASSIGNED;
    totals.set(id, (totals.get(id) ?? 0) + getAmount(row));
    if (!names.has(id)) names.set(id, getStaffName(row) ?? "Unassigned");
  }
  return [...totals.entries()].map(([id, total]) => ({
    label: id === UNASSIGNED ? "Unassigned" : names.get(id)!,
    total,
  }));
}

export async function getRevenueSummary(
  supabase: SupabaseClient,
  businessId: string,
  range: RevenueDateRange,
  stationId?: string,
): Promise<RevenueSummary> {
  const filterByStation = stationId && stationId !== "all";

  let txQuery = supabase
    .from("transactions")
    .select("amount, tip_amount, service_name, staff_id, staff:staff_id(display_name)")
    .eq("business_id", businessId)
    .gte("transaction_date", range.startUTC.toISOString())
    .lt("transaction_date", range.endUTC.toISOString());
  if (filterByStation) txQuery = txQuery.eq("station_id", stationId);

  let batchLineQuery = supabase
    .from("batch_services")
    .select(
      "service_name, line_total, quantity, batches!inner(batch_date, status, station_id, staff_id, staff:staff_id(display_name))",
    )
    .eq("business_id", businessId)
    .eq("batches.status", "active")
    .gte("batches.batch_date", range.startDateStr)
    .lte("batches.batch_date", range.endDateStr);
  if (filterByStation) batchLineQuery = batchLineQuery.eq("batches.station_id", stationId);

  let batchHeaderQuery = supabase
    .from("batches")
    .select("tip_amount, staff_id, staff:staff_id(display_name)")
    .eq("business_id", businessId)
    .eq("status", "active")
    .gte("batch_date", range.startDateStr)
    .lte("batch_date", range.endDateStr);
  if (filterByStation) batchHeaderQuery = batchHeaderQuery.eq("station_id", stationId);

  let productSalesQuery = supabase
    .from("product_sales")
    .select("product_name, amount, quantity, cost_price")
    .eq("business_id", businessId)
    .gte("sale_date", range.startUTC.toISOString())
    .lt("sale_date", range.endUTC.toISOString());
  if (filterByStation) productSalesQuery = productSalesQuery.eq("station_id", stationId);

  const [{ data: transactions }, { data: batchLines }, { data: batchHeaders }, { data: productSales }] =
    await Promise.all([
      txQuery.returns<TransactionRow[]>(),
      batchLineQuery.returns<BatchLineRow[]>(),
      batchHeaderQuery.returns<BatchHeaderRow[]>(),
      productSalesQuery.returns<ProductSaleRow[]>(),
    ]);

  const txRows = transactions ?? [];
  const lineRows = batchLines ?? [];
  const headerRows = batchHeaders ?? [];
  const productSaleRows = productSales ?? [];

  const txRevenue = sum(txRows.map((t) => ({ amount: t.amount })));
  const batchRevenue = sum(lineRows.map((l) => ({ amount: l.line_total })));

  const txTips = sum(txRows.map((t) => ({ amount: t.tip_amount })));
  const batchTips = sum(headerRows.map((b) => ({ amount: b.tip_amount })));

  const servicesPerformed =
    txRows.length + lineRows.reduce((total, l) => total + l.quantity, 0);

  const revenueByStaff = mergeTotals(
    groupByStaffId(
      txRows,
      (t) => t.staff_id,
      (t) => t.staff?.display_name,
      (t) => Number(t.amount),
    ),
    groupByStaffId(
      lineRows,
      (l) => l.batches?.staff_id ?? null,
      (l) => l.batches?.staff?.display_name,
      (l) => Number(l.line_total),
    ),
  );

  const revenueByService = mergeTotals(
    groupSum(
      txRows,
      (t) => t.service_name,
      (t) => Number(t.amount),
    ),
    groupSum(
      lineRows,
      (l) => l.service_name,
      (l) => Number(l.line_total),
    ),
  );

  const tipsByStaff = mergeTotals(
    groupByStaffId(
      txRows.filter((t) => Number(t.tip_amount) > 0),
      (t) => t.staff_id,
      (t) => t.staff?.display_name,
      (t) => Number(t.tip_amount),
    ),
    groupByStaffId(
      headerRows.filter((b) => Number(b.tip_amount) > 0),
      (b) => b.staff_id,
      (b) => b.staff?.display_name,
      (b) => Number(b.tip_amount),
    ),
  );

  // A voided sale's reversing row carries a negative quantity/amount at the
  // same cost_price snapshot, so cost_price * quantity nets out correctly
  // right alongside amount — no separate "exclude voided" filter needed.
  const serviceRevenue = txRevenue + batchRevenue;
  const productRevenue = sum(productSaleRows.map((p) => ({ amount: p.amount })));
  const productCOGS = productSaleRows.reduce(
    (total, p) => total + Number(p.cost_price) * p.quantity,
    0,
  );
  const revenueByProduct = groupSum(
    productSaleRows,
    (p) => p.product_name,
    (p) => Number(p.amount),
  );

  return {
    serviceRevenue,
    productRevenue,
    totalRevenue: serviceRevenue + productRevenue,
    productCOGS,
    tips: txTips + batchTips,
    servicesPerformed,
    revenueByStaff,
    revenueByService,
    revenueByProduct,
    tipsByStaff,
  };
}

export type TrendPoint = { date: string; label: string; total: number };

// Day-by-day total revenue (service + product) for a trend chart — the
// exact same rows/filters getRevenueSummary reads (same business_id/
// station_id scope, same date range), just bucketed by local calendar day
// instead of summed once. No new business logic, no new query shape.
export async function getRevenueTrend(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string,
  range: RevenueDateRange,
  stationId?: string,
): Promise<TrendPoint[]> {
  const filterByStation = stationId && stationId !== "all";

  let txQuery = supabase
    .from("transactions")
    .select("amount, transaction_date")
    .eq("business_id", businessId)
    .gte("transaction_date", range.startUTC.toISOString())
    .lt("transaction_date", range.endUTC.toISOString());
  if (filterByStation) txQuery = txQuery.eq("station_id", stationId);

  let batchLineQuery = supabase
    .from("batch_services")
    .select("line_total, batches!inner(batch_date, status, station_id)")
    .eq("business_id", businessId)
    .eq("batches.status", "active")
    .gte("batches.batch_date", range.startDateStr)
    .lte("batches.batch_date", range.endDateStr);
  if (filterByStation) batchLineQuery = batchLineQuery.eq("batches.station_id", stationId);

  let productSalesQuery = supabase
    .from("product_sales")
    .select("amount, sale_date")
    .eq("business_id", businessId)
    .gte("sale_date", range.startUTC.toISOString())
    .lt("sale_date", range.endUTC.toISOString());
  if (filterByStation) productSalesQuery = productSalesQuery.eq("station_id", stationId);

  const [{ data: transactions }, { data: batchLines }, { data: productSales }] = await Promise.all([
    txQuery.returns<{ amount: number; transaction_date: string }[]>(),
    batchLineQuery.returns<{ line_total: number; batches: { batch_date: string } | null }[]>(),
    productSalesQuery.returns<{ amount: number; sale_date: string }[]>(),
  ]);

  const totalsByDate = new Map<string, number>();
  for (const t of transactions ?? []) {
    const d = utcToLocalDateStr(timezone, new Date(t.transaction_date));
    totalsByDate.set(d, (totalsByDate.get(d) ?? 0) + Number(t.amount));
  }
  for (const l of batchLines ?? []) {
    const d = l.batches?.batch_date;
    if (!d) continue;
    totalsByDate.set(d, (totalsByDate.get(d) ?? 0) + Number(l.line_total));
  }
  for (const p of productSales ?? []) {
    const d = utcToLocalDateStr(timezone, new Date(p.sale_date));
    totalsByDate.set(d, (totalsByDate.get(d) ?? 0) + Number(p.amount));
  }

  // Fill every day in the range (not just days with activity) so the
  // chart reads as a continuous series.
  const points: TrendPoint[] = [];
  let cursor = range.startDateStr;
  while (cursor <= range.endDateStr) {
    const day = Number(cursor.slice(8, 10));
    points.push({ date: cursor, label: String(day), total: totalsByDate.get(cursor) ?? 0 });
    cursor = shiftDateStr(cursor, 1);
  }
  return points;
}
