"use client";

import { useState } from "react";
import type { ResolvedPeriod } from "@/lib/reports/period";
import type { Outlet } from "@/lib/business/outlets";
import { FilterBar } from "@/components/ui/filter-bar";
import { SelectField, selectClasses } from "@/components/ui/select-field";
import { buttonClasses } from "@/components/ui/button";

export function PeriodFilter({
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
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom</option>
      </SelectField>

      {(period === "daily" || period === "weekly") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs font-medium text-ink-secondary">
            {period === "daily" ? "Date" : "Any day in the week"}
          </label>
          <input id="date" name="date" type="date" defaultValue={resolved.dateInput} className={selectClasses()} />
        </div>
      )}

      {period === "monthly" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-xs font-medium text-ink-secondary">
            Month
          </label>
          <input id="month" name="month" type="month" defaultValue={resolved.monthInput} className={selectClasses()} />
        </div>
      )}

      {period === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-xs font-medium text-ink-secondary">
              Start
            </label>
            <input id="start" name="start" type="date" defaultValue={resolved.startDateStr} className={selectClasses()} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="end" className="text-xs font-medium text-ink-secondary">
              End
            </label>
            <input id="end" name="end" type="date" defaultValue={resolved.endDateStr} className={selectClasses()} />
          </div>
        </>
      )}

      <button type="submit" className={buttonClasses("primary")}>
        Apply
      </button>
    </FilterBar>
  );
}
