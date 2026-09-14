"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/select-field";

type Period = "today" | "month";

// Both values are computed server-side already (Dashboard needs today's
// and this month's figures regardless), so switching the selector is a
// pure client-side toggle — no extra request, and this card's selector is
// fully independent from the Revenue card's.
export function FinancialStatCard({
  label,
  todayValue,
  monthValue,
}: {
  label: string;
  todayValue: string;
  monthValue: string;
}) {
  const [period, setPeriod] = useState<Period>("today");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-ink/[0.02]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{label}</h2>
        <SelectField
          aria-label={`${label} period`}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="w-32 py-1.5 text-xs"
        >
          <option value="today">Today</option>
          <option value="month">This month</option>
        </SelectField>
      </div>
      <p className="mt-4 text-2xl font-semibold text-ink">
        {period === "today" ? todayValue : monthValue}
      </p>
    </div>
  );
}
