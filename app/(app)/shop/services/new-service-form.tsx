"use client";

import { useActionState } from "react";
import { createService } from "@/lib/services/actions";
import { initialServiceActionState } from "@/lib/services/types";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/constants";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

export function NewServiceForm({ businessId }: { businessId: string }) {
  const createServiceWithBusiness = createService.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createServiceWithBusiness,
    initialServiceActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Service name" name="name" required suggestions={SERVICE_NAME_SUGGESTIONS} />
        <FormField label="Price" name="price" type="number" required />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add service"}
      </Button>
    </form>
  );
}
