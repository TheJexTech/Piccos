"use client";

import { useActionState } from "react";
import { updateMaterial, deleteMaterial } from "@/lib/materials/actions";
import { initialMaterialActionState, type Material } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

export function EditSupplyForm({ material, canManage }: { material: Material; canManage: boolean }) {
  const updateMaterialWithId = updateMaterial.bind(null, material.id);
  const [state, formAction, pending] = useActionState(
    updateMaterialWithId,
    initialMaterialActionState,
  );

  if (!canManage) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">{material.name}</h1>
        <p className="mt-2 text-sm text-muted">Current quantity: {material.current_quantity}</p>
      </div>
    );
  }

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-4">
        <FormField label="Supply name" name="name" defaultValue={material.name} required />
        {/* Not directly editable — it only changes by recording a purchase,
            so it can never drift from the history that explains it. */}
        <p className="text-sm text-muted">
          Current quantity: <span className="font-medium text-ink">{material.current_quantity}</span> (updates
          when you record a purchase below)
        </p>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>

      <form action={deleteMaterial.bind(null, material.id)} className="mt-2">
        <button type="submit" className="text-sm text-danger hover:underline">
          Delete
        </button>
      </form>
    </div>
  );
}
