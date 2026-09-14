"use client";

import { useActionState } from "react";
import { updateBusiness } from "@/lib/business/actions";
import { initialBusinessActionState, type Business } from "@/lib/business/types";
import { TIMEZONES, NIGERIA_STATES, COUNTRIES } from "@/lib/business/constants";
import { FormField } from "@/components/form-field";

export function ShopForm({ business, readOnly }: { business: Business; readOnly: boolean }) {
  const updateBusinessWithId = updateBusiness.bind(null, business.id);
  const [state, formAction, pending] = useActionState(
    updateBusinessWithId,
    initialBusinessActionState,
  );

  if (readOnly) {
    return (
      <div className="mt-6 flex flex-col gap-2 text-sm text-black dark:text-zinc-50">
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Name:</span> {business.name}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Description:</span>{" "}
          {business.description || "—"}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Phone:</span>{" "}
          {business.phone || "—"}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Email:</span>{" "}
          {business.email || "—"}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Address:</span>{" "}
          {[business.address, business.city, business.state, business.country]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Currency:</span> {business.currency}
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">Timezone:</span> {business.timezone}
        </p>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Only the owner can edit business settings.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <FormField label="Business name" name="name" defaultValue={business.name} required />
      <FormField
        label="Description"
        name="description"
        defaultValue={business.description ?? ""}
        textarea
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Phone" name="phone" defaultValue={business.phone ?? ""} />
        {/* Business contact email — optional, and intentionally separate from
            the owner's Piccos account (login) email. */}
        <FormField
          label="Business email (optional)"
          name="email"
          type="email"
          defaultValue={business.email ?? ""}
        />
      </div>

      <FormField label="Address" name="address" defaultValue={business.address ?? ""} />

      <div className="grid grid-cols-3 gap-4">
        <FormField label="City" name="city" defaultValue={business.city ?? ""} />
        <div className="flex flex-col gap-1">
          <label htmlFor="state" className="text-sm text-zinc-600 dark:text-zinc-400">
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue={business.state ?? ""}
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
            defaultValue={business.country || COUNTRIES[0].value}
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
        <FormField label="Currency" name="currency" defaultValue={business.currency} />
        <div className="flex flex-col gap-1">
          <label htmlFor="timezone" className="text-sm text-zinc-600 dark:text-zinc-400">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={business.timezone}
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
