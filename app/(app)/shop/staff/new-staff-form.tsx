"use client";

import { useActionState } from "react";
import { createStaff } from "@/lib/staff/actions";
import { initialStaffActionState } from "@/lib/staff/types";
import { FormField } from "@/components/form-field";

export function NewStaffForm({
  businessId,
  stations,
}: {
  businessId: string;
  stations: { id: string; name: string }[];
}) {
  const createStaffWithBusiness = createStaff.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createStaffWithBusiness,
    initialStaffActionState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Staff name" name="display_name" required />
        <div className="flex flex-col gap-1">
          <label htmlFor="station_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Station
          </label>
          <select
            id="station_id"
            name="station_id"
            defaultValue=""
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Unassigned</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding…" : "Add staff"}
      </button>
    </form>
  );
}
