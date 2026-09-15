"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Same URL/query-param contract a native GET submit would produce — this
  // just avoids the full browser reload a plain <form method="get"> causes,
  // keeping the current page visible while the new data loads.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <FilterBar onSubmit={handleSubmit}>
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

      <button type="submit" className={buttonClasses("primary")} disabled={isPending}>
        {isPending ? "Applying…" : "Apply"}
      </button>
    </FilterBar>
  );
}
