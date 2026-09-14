"use client";

import { useActionState } from "react";
import { createMaterial } from "@/lib/materials/actions";
import { initialMaterialActionState } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

export function NewSupplyForm({ businessId }: { businessId: string }) {
  const createMaterialWithBusiness = createMaterial.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createMaterialWithBusiness,
    initialMaterialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Supply name" name="name" required />
      <FormField label="Starting quantity" name="current_quantity" type="number" />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add supply"}
      </Button>
    </form>
  );
}
