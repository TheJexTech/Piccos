"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/select-field";

type Period = "today" | "month";
type Breakdown = { serviceRevenue: string; productRevenue: string; totalRevenue: string };

// Same independent-toggle mechanism as FinancialStatCard (both periods'
// values are already computed server-side, so switching is a pure
// client-side toggle) — three KPI-style figures (Total/Service/Product)
// sharing one period control, matching the "Revenue" grouping the rest of
// the app already treats as one togglable unit.
export function RevenueBreakdownCard({
  todayValues,
  monthValues,
}: {
  todayValues: Breakdown;
  monthValues: Breakdown;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const values = period === "today" ? todayValues : monthValues;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-ink/[0.02]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Revenue</h2>
        <SelectField
          aria-label="Revenue period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="w-32 py-1.5 text-xs"
        >
          <option value="today">Today</option>
          <option value="month">This month</option>
        </SelectField>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Total Revenue</p>
          <p className="mt-1 text-xl font-semibold text-ink">{values.totalRevenue}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Service Revenue</p>
          <p className="mt-1 text-xl font-semibold text-ink">{values.serviceRevenue}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Product Sales</p>
          <p className="mt-1 text-xl font-semibold text-ink">{values.productRevenue}</p>
        </div>
      </div>
    </div>
  );
}
