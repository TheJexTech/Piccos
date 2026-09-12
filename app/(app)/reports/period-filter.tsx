"use client";

import { useState } from "react";
import type { ResolvedPeriod } from "@/lib/reports/period";

const inputClassName =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function PeriodFilter({ resolved }: { resolved: ResolvedPeriod }) {
  const [period, setPeriod] = useState(resolved.period);

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="period" className="text-sm text-zinc-600 dark:text-zinc-400">
          Period
        </label>
        <select
          id="period"
          name="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className={inputClassName}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {(period === "daily" || period === "weekly") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-sm text-zinc-600 dark:text-zinc-400">
            {period === "daily" ? "Date" : "Any day in the week"}
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={resolved.dateInput}
            className={inputClassName}
          />
        </div>
      )}

      {period === "monthly" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-sm text-zinc-600 dark:text-zinc-400">
            Month
          </label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={resolved.monthInput}
            className={inputClassName}
          />
        </div>
      )}

      {period === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-sm text-zinc-600 dark:text-zinc-400">
              Start
            </label>
            <input
              id="start"
              name="start"
              type="date"
              defaultValue={resolved.startDateStr}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="end" className="text-sm text-zinc-600 dark:text-zinc-400">
              End
            </label>
            <input
              id="end"
              name="end"
              type="date"
              defaultValue={resolved.endDateStr}
              className={inputClassName}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Apply
      </button>
    </form>
  );
}
