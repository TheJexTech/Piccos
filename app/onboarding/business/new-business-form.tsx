"use client";

import { useActionState } from "react";
import { createBusiness } from "@/lib/business/actions";
import { initialBusinessActionState } from "@/lib/business/types";
import { TIMEZONES } from "@/lib/business/constants";
import { FormField } from "@/components/form-field";

export function NewBusinessForm() {
  const [state, formAction, pending] = useActionState(createBusiness, initialBusinessActionState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <FormField label="Business name" name="name" required />
      <FormField label="Description" name="description" textarea />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Phone" name="phone" />
        <FormField label="Email" name="email" type="email" />
      </div>

      <FormField label="Address" name="address" />

      <div className="grid grid-cols-3 gap-4">
        <FormField label="City" name="city" />
        <FormField label="State" name="state" />
        <FormField label="Country" name="country" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Currency" name="currency" defaultValue="NGN" />
        <div className="flex flex-col gap-1">
          <label htmlFor="timezone" className="text-sm text-zinc-600 dark:text-zinc-400">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue="Africa/Lagos"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating…" : "Create business"}
      </button>
    </form>
  );
}
