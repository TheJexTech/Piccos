"use client";

import { useActionState } from "react";
import { updateMaterial, deleteMaterial } from "@/lib/materials/actions";
import { initialMaterialActionState, type Material } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";

export function MaterialRow({ material }: { material: Material }) {
  const updateMaterialWithId = updateMaterial.bind(null, material.id);
  const [state, formAction, pending] = useActionState(
    updateMaterialWithId,
    initialMaterialActionState,
  );
  const lowStock = Number(material.current_quantity) <= Number(material.minimum_quantity);

  return (
    <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <FormField label="Name" name="name" defaultValue={material.name} required />
          <FormField label="Unit" name="unit" defaultValue={material.unit} required />
          <FormField
            label="Current quantity"
            name="current_quantity"
            type="number"
            defaultValue={String(material.current_quantity)}
            required
          />
          <FormField
            label="Minimum quantity"
            name="minimum_quantity"
            type="number"
            defaultValue={String(material.minimum_quantity)}
            required
          />
        </div>

        {lowStock && (
          <p className="text-sm text-amber-600">Low stock — at or below the minimum quantity.</p>
        )}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <form action={deleteMaterial.bind(null, material.id)} className="mt-2">
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete
        </button>
      </form>
    </li>
  );
}
