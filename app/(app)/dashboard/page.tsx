import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { getBusinessOutlets, resolveOutletId } from "@/lib/business/outlets";
import { resolveReportPeriod, type ResolvedPeriod } from "@/lib/reports/period";
import { localDateRangeToUTC } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/dashboard/format";
import { sum } from "@/lib/dashboard/aggregate";
import { getRevenueSummary, getRevenueTrend, type RevenueDateRange } from "@/lib/revenue/aggregate";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { TrendChart } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { FinancialStatCard } from "./financial-stat-card";
import { RevenueBreakdownCard } from "./revenue-breakdown-card";
import { OutletSelector } from "./outlet-selector";

function toRange(timezone: string, period: ResolvedPeriod): RevenueDateRange {
  const { startUTC, endUTC } = localDateRangeToUTC(timezone, period.startDateStr, period.endDateStr);
  return { startUTC, endUTC, startDateStr: period.startDateStr, endDateStr: period.endDateStr };
}

// Dashboard answers "how is my shop doing?" in one glance — the detailed
// breakdowns (by staff, by service, tips) live on Revenue and Reports now,
// not duplicated here.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const businessId = membership.businessId;
  const canSeeFullDashboard = membership.role === "owner" || membership.role === "secretary";

  // Neither of these depends on the other's result (both only need
  // businessId), so they run as one round trip instead of two sequential
  // ones — same pattern as the earlier Staff/Outlets/Services fix. Barbers
  // never use the outlets list (no selector on their view), so skip that
  // query entirely for them rather than fetching it unused.
  const [{ data: business }, outlets] = await Promise.all([
    supabase.from("businesses").select("timezone, currency").eq("id", businessId).single(),
    canSeeFullDashboard ? getBusinessOutlets(supabase, businessId) : Promise.resolve([]),
  ]);

  const timezone = business?.timezone ?? "Africa/Lagos";
  const currency = business?.currency ?? "NGN";
  const money = (n: number) => formatMoney(n, currency);

  const todayPeriod = resolveReportPeriod(timezone, {});
  const monthPeriod = resolveReportPeriod(timezone, { period: "monthly" });

  if (!canSeeFullDashboard) {
    // Barber: RLS scopes both queries to their own activity automatically —
    // same zero-special-casing pattern used by Ask Piccos's snapshot. No
    // outlet selector for this view — out of scope for this correction.
    const [todaySummary, monthSummary] = await Promise.all([
      getRevenueSummary(supabase, businessId, toRange(timezone, todayPeriod)),
      getRevenueSummary(supabase, businessId, toRange(timezone, monthPeriod)),
    ]);

    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Your performance</h1>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard label="Today's Revenue" value={money(todaySummary.serviceRevenue)} />
          <MetricCard label="This month's Revenue" value={money(monthSummary.serviceRevenue)} />
        </div>
        <Link href="/revenue" className={`${buttonClasses("secondary")} mt-6`}>
          See full breakdown, including tips →
        </Link>
      </div>
    );
  }

  // Outlets = this business's stations (see lib/business/outlets.ts),
  // already fetched above alongside the business row. Defaults to "All
  // Outlets" combined when nothing is selected yet — unless the user only
  // has exactly one outlet available, in which case that's the only
  // meaningful selection and there's no "all" state distinct from it.
  const singleOutlet = outlets.length === 1;
  const selectedOutlet = singleOutlet ? outlets[0].id : resolveOutletId(params.outlet, outlets);
  const outletQuery = `?outlet=${selectedOutlet}`;
  const stationId = selectedOutlet === "all" ? undefined : selectedOutlet;

  let expTodayQuery = supabase
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .eq("expense_date", todayPeriod.startDateStr);
  let expMonthQuery = supabase
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .gte("expense_date", monthPeriod.startDateStr)
    .lte("expense_date", monthPeriod.endDateStr);
  if (stationId) {
    expTodayQuery = expTodayQuery.eq("station_id", stationId);
    expMonthQuery = expMonthQuery.eq("station_id", stationId);
  }

  const [todaySummary, monthSummary, { data: expToday }, { data: expMonth }, trend] = await Promise.all([
    getRevenueSummary(supabase, businessId, toRange(timezone, todayPeriod), stationId),
    getRevenueSummary(supabase, businessId, toRange(timezone, monthPeriod), stationId),
    expTodayQuery,
    expMonthQuery,
    getRevenueTrend(supabase, businessId, timezone, toRange(timezone, monthPeriod), stationId),
  ]);

  const expensesToday = sum(expToday);
  const expensesMonth = sum(expMonth);
  // Estimated profit = service revenue + product sales - operating expenses
  // - product cost of goods sold. Operating expenses and product COGS are
  // two separate cost categories from two separate tables, each summed
  // once — nothing here double-counts a cost already represented elsewhere.
  const profitToday = todaySummary.totalRevenue - expensesToday - todaySummary.productCOGS;
  const profitMonth = monthSummary.totalRevenue - expensesMonth - monthSummary.productCOGS;

  const topStaff = monthSummary.revenueByStaff.filter((s) => s.label !== "Unassigned").slice(0, 5);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <OutletSelector outlets={outlets} selected={selectedOutlet} />
      </div>

      {/* Revenue's three figures (Total/Service/Product) share one period
          toggle; Estimated Profit has its own independent one — the full
          period-by-period breakdown (by staff, by service, by product,
          tips, trends) stays on the dedicated Revenue page. */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueBreakdownCard
            todayValues={{
              serviceRevenue: money(todaySummary.serviceRevenue),
              productRevenue: money(todaySummary.productRevenue),
              totalRevenue: money(todaySummary.totalRevenue),
            }}
            monthValues={{
              serviceRevenue: money(monthSummary.serviceRevenue),
              productRevenue: money(monthSummary.productRevenue),
              totalRevenue: money(monthSummary.totalRevenue),
            }}
          />
        </div>
        <FinancialStatCard
          label="Estimated Profit"
          todayValue={money(profitToday)}
          monthValue={money(profitMonth)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Revenue trend" description="This month, by day">
            <TrendChart
              data={trend.map((t) => ({ label: t.label, value: t.total }))}
              formatValue={money}
            />
          </SectionCard>
        </div>

        {/* This Month only — deliberately independent of the Revenue
            card's own Today/This-month toggle. Product sales aren't
            attributed to a staff member (no such relationship exists), so
            this ranks service revenue only, grouped by staff id (never by
            name — see lib/revenue/aggregate.ts). */}
        <SectionCard title="Best Performing Staff" description="This month">
          {topStaff.length === 0 ? (
            <EmptyState message="No revenue recorded yet this month." />
          ) : (
            <ol className="flex flex-col gap-3">
              {topStaff.map((s, i) => (
                <li key={`${s.label}-${i}`} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-medium text-muted">{i + 1}</span>
                  <Avatar name={s.label} size="sm" />
                  <span className="flex-1 truncate text-sm text-ink">{s.label}</span>
                  <span className="text-sm font-medium text-ink">{money(s.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/activity" className={buttonClasses("primary")}>
          Record Activity
        </Link>
        <Link href={`/revenue${outletQuery}`} className={buttonClasses("secondary")}>
          View Revenue
        </Link>
        <Link href={`/reports${outletQuery}`} className={buttonClasses("secondary")}>
          View Reports
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted">
        Estimated profit = service revenue + product sales − operating expenses − product cost of
        goods sold. Tips are never included in revenue or estimated profit. Not a formal accounting
        figure.
      </p>
    </div>
  );
}
