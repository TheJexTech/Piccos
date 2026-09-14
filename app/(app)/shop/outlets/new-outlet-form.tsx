"use client";

import { useActionState } from "react";
import { createStation } from "@/lib/stations/actions";
import { initialStationActionState } from "@/lib/stations/types";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

export function NewOutletForm({ businessId }: { businessId: string }) {
  const createStationWithBusiness = createStation.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createStationWithBusiness,
    initialStationActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Outlet name" name="name" required />
        <FormField label="Description" name="description" />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add Outlet"}
      </Button>
    </form>
  );
}
