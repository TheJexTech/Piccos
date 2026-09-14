"use client";

import { useState } from "react";
import type { ResolvedPeriod } from "@/lib/reports/period";
import type { Outlet } from "@/lib/business/outlets";
import { FilterBar } from "@/components/ui/filter-bar";
import { SelectField, selectClasses } from "@/components/ui/select-field";
import { buttonClasses } from "@/components/ui/button";

const PRESETS = [
  { value: "daily", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
] as const;

export function RevenuePeriodFilter({
  resolved,
  outlets,
  selectedOutlet,
}: {
  resolved: ResolvedPeriod;
  outlets: Outlet[];
  selectedOutlet: string;
}) {
  const [period, setPeriod] = useState(resolved.period);

  return (
    <FilterBar>
      <SelectField label="Outlet" id="outlet" name="outlet" defaultValue={selectedOutlet}>
        <option value="all">All Outlets</option>
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Period"
        id="period"
        name="period"
        value={period}
        onChange={(e) => setPeriod(e.target.value as typeof period)}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </SelectField>

      {period === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-xs font-medium text-ink-secondary">
              Start
            </label>
            <input
              id="start"
              name="start"
              type="date"
              defaultValue={resolved.startDateStr}
              className={selectClasses()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="end" className="text-xs font-medium text-ink-secondary">
              End
            </label>
            <input
              id="end"
              name="end"
              type="date"
              defaultValue={resolved.endDateStr}
              className={selectClasses()}
            />
          </div>
        </>
      )}

      <button type="submit" className={buttonClasses("primary")}>
        Apply
      </button>
    </FilterBar>
  );
}
