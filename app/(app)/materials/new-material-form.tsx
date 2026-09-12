"use client";

import { useActionState } from "react";
import { createMaterial } from "@/lib/materials/actions";
import { initialMaterialActionState } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";

export function NewMaterialForm({ businessId }: { businessId: string }) {
  const createMaterialWithBusiness = createMaterial.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createMaterialWithBusiness,
    initialMaterialActionState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Add material</h2>
      <div className="grid grid-cols-4 gap-4">
        <FormField label="Name" name="name" required />
        <FormField label="Unit" name="unit" required />
        <FormField label="Starting quantity" name="current_quantity" type="number" />
        <FormField label="Minimum quantity" name="minimum_quantity" type="number" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding…" : "Add material"}
      </button>
    </form>
  );
}
