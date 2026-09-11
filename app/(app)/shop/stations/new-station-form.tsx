"use client";

import { useActionState } from "react";
import { createStation } from "@/lib/stations/actions";
import { initialStationActionState } from "@/lib/stations/types";
import { FormField } from "@/components/form-field";

export function NewStationForm({ businessId }: { businessId: string }) {
  const createStationWithBusiness = createStation.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createStationWithBusiness,
    initialStationActionState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Station name" name="name" required />
        <FormField label="Description" name="description" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding…" : "Add station"}
      </button>
    </form>
  );
}
