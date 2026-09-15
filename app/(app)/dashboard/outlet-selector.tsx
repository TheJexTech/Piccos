"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Outlet } from "@/lib/business/outlets";
import { SelectField } from "@/components/ui/select-field";
import { OutletsIcon } from "@/components/ui/icons";

// Dashboard has no other query params to preserve, so a plain router.push
// keeps this simple — no useSearchParams/Suspense boundary needed.
//
// The push is wrapped in a transition so React keeps the current dashboard
// on screen (instead of it going blank) while the new outlet's data loads —
// isPending only drives a small inline indicator here, nothing about what
// gets fetched or rendered changes.
export function OutletSelector({
  outlets,
  selected,
}: {
  outlets: Outlet[];
  selected: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Exactly one outlet means there's no real choice to offer — a dropdown
  // whose only other option ("All Outlets") produces identical numbers is
  // just friction. Show it as a fixed label instead. Two or more outlets
  // falls through to the existing interactive selector, unchanged.
  if (outlets.length === 1) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-secondary">Outlet</span>
        <div className="flex w-full items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink sm:w-56">
          <OutletsIcon className="size-4 shrink-0 text-muted" />
          <span className="truncate">{outlets[0].name}</span>
        </div>
      </div>
    );
  }

  function handleChange(value: string) {
    const href = value === "all" ? "/dashboard" : `/dashboard?outlet=${value}`;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <SelectField
        label="Outlet"
        id="outlet"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="w-full sm:w-56 disabled:opacity-60"
      >
        <option value="all">All Outlets</option>
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </SelectField>
      {isPending && <span className="mb-0.5 text-xs text-muted">Updating…</span>}
    </div>
  );
}
