"use client";

import { useActionState } from "react";
import { createBusiness } from "@/lib/business/actions";
import { initialBusinessActionState } from "@/lib/business/types";
import { TIMEZONES, NIGERIA_STATES, COUNTRIES } from "@/lib/business/constants";
import { FormField } from "@/components/form-field";

// Shared by the zero-shops onboarding flow and "+ Add another shop" — both
// just create a business and land the owner switched into its setup
// checklist (see createBusiness in lib/business/actions.ts).
export function NewBusinessForm() {
  const [state, formAction, pending] = useActionState(createBusiness, initialBusinessActionState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <FormField label="Business name" name="name" required />
      <FormField label="Description" name="description" textarea />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Phone" name="phone" />
        {/* Business contact email — optional, and intentionally separate from
            the owner's Piccos account (login) email. */}
        <FormField label="Business email (optional)" name="email" type="email" />
      </div>

      <FormField label="Address" name="address" />

      <div className="grid grid-cols-3 gap-4">
        <FormField label="City" name="city" />
        <div className="flex flex-col gap-1">
          <label htmlFor="state" className="text-sm text-zinc-600 dark:text-zinc-400">
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue=""
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Select a state</option>
            {NIGERIA_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="country" className="text-sm text-zinc-600 dark:text-zinc-400">
            Country
          </label>
          <select
            id="country"
            name="country"
            defaultValue={COUNTRIES[0].value}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {COUNTRIES.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </div>
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
