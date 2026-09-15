"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Outlet } from "@/lib/business/outlets";
import { SelectField } from "@/components/ui/select-field";

// Dashboard has no other query params to preserve, so a plain router.push
// keeps this simple — no useSearchParams/Suspense boundary needed.
//
// The push is wrapped in a transition so React keeps the current dashboard
// on screen (instead of it going blank) while the new outlet's data loads —
// isPending only drives a small inline indicator here, nothing about what
// gets fetched or rendered changes.
export function OutletSelector({ outlets, selected }: { outlets: Outlet[]; selected: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
