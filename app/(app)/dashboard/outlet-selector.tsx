"use client";

import { useRouter } from "next/navigation";
import type { Outlet } from "@/lib/business/outlets";
import { SelectField } from "@/components/ui/select-field";

// Dashboard has no other query params to preserve, so a plain router.push
// keeps this simple — no useSearchParams/Suspense boundary needed.
export function OutletSelector({ outlets, selected }: { outlets: Outlet[]; selected: string }) {
  const router = useRouter();

  function handleChange(value: string) {
    router.push(value === "all" ? "/dashboard" : `/dashboard?outlet=${value}`);
  }

  return (
    <SelectField
      label="Outlet"
      id="outlet"
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full sm:w-56"
    >
      <option value="all">All Outlets</option>
      {outlets.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </SelectField>
  );
}
