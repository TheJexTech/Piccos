"use client";

import { useActionState } from "react";
import { createService } from "@/lib/services/actions";
import { initialServiceActionState } from "@/lib/services/types";
import { FormField } from "@/components/form-field";

export function NewServiceForm({ businessId }: { businessId: string }) {
  const createServiceWithBusiness = createService.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createServiceWithBusiness,
    initialServiceActionState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Service name" name="name" required />
        <FormField label="Description" name="description" />
        <FormField label="Price" name="price" type="number" required />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding…" : "Add service"}
      </button>
    </form>
  );
}
