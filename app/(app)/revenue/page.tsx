import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { getBusinessOutlets, resolveOutletId } from "@/lib/business/outlets";
import { resolveReportPeriod, type ResolvedPeriod } from "@/lib/reports/period";
import { localDateRangeToUTC, shiftDateStr } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/dashboard/format";
import { getRevenueSummary, type RevenueDateRange } from "@/lib/revenue/aggregate";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { BreakdownBars } from "@/components/ui/chart";
import { RevenuePeriodFilter } from "./period-filter";

function toRange(timezone: string, startDateStr: string, endDateStr: string): RevenueDateRange {
  const { startUTC, endUTC } = localDateRangeToUTC(timezone, startDateStr, endDateStr);
  return { startUTC, endUTC, startDateStr, endDateStr };
}

// The immediately preceding period of the same length, for the trend line —
// works generically for any preset (today -> yesterday, this week -> last
// week, a custom 10-day range -> the 10 days before it).
function priorPeriod(resolved: ResolvedPeriod): { startDateStr: string; endDateStr: string } {
  const [y1, m1, d1] = resolved.startDateStr.split("-").map(Number);
  const [y2, m2, d2] = resolved.endDateStr.split("-").map(Number);
  const lengthDays = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
  return {
    startDateStr: shiftDateStr(resolved.startDateStr, -lengthDays),
    endDateStr: shiftDateStr(resolved.startDateStr, -1),
  };
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string; end?: string; outlet?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No role gate — RLS already scopes a barber's query to just their own
  // transactions/batches (same zero-special-casing pattern as Ask Piccos
  // and the barber Dashboard view), so a barber sees their own revenue and
  // tips here rather than being locked out entirely.
  const membership = await requireCurrentMembership(supabase, user.id);
  const businessId = membership.businessId;

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
  const prior = priorPeriod(resolved);

  const [summary, priorSummary] = await Promise.all([
    getRevenueSummary(supabase, businessId, toRange(timezone, resolved.startDateStr, resolved.endDateStr), stationId),
    getRevenueSummary(supabase, businessId, toRange(timezone, prior.startDateStr, prior.endDateStr), stationId),
  ]);

  const trendPct =
    priorSummary.serviceRevenue > 0
      ? ((summary.serviceRevenue - priorSummary.serviceRevenue) / priorSummary.serviceRevenue) * 100
      : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Revenue</h1>
      <p className="mt-1 text-sm text-muted">
        {viewingOutletName ? `${viewingOutletName} · ` : ""}
        {resolved.label}
      </p>

      <div className="mt-6">
        <RevenuePeriodFilter resolved={resolved} outlets={outlets} selectedOutlet={selectedOutlet} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total revenue"
          value={money(summary.totalRevenue)}
          trend={
            trendPct !== null
              ? { direction: trendPct >= 0 ? "up" : "down", label: `${Math.abs(trendPct).toFixed(0)}% vs previous period` }
              : undefined
          }
        />
        <MetricCard label="Service revenue" value={money(summary.serviceRevenue)} />
        <MetricCard label="Product sales" value={money(summary.productRevenue)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Services performed" value={String(summary.servicesPerformed)} />
        <MetricCard label="Tips" value={money(summary.tips)} sublabel="Never included in revenue" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue by staff">
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
        <SectionCard title="Tips by staff">
          <BreakdownBars
            data={summary.tipsByStaff}
            formatValue={money}
            emptyMessage="No tips recorded in this period."
          />
        </SectionCard>
      </div>

      <p className="mt-6 text-xs text-muted">
        Tips are shown separately and are never included in service revenue.
      </p>
    </div>
  );
}
