"use client";

import { useActionState } from "react";
import { createStaff } from "@/lib/staff/actions";
import { initialStaffActionState } from "@/lib/staff/types";
import { FormField } from "@/components/form-field";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";

export function NewStaffForm({
  businessId,
  stations,
}: {
  businessId: string;
  stations: { id: string; name: string }[];
}) {
  const createStaffWithBusiness = createStaff.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createStaffWithBusiness,
    initialStaffActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Staff name" name="display_name" required />
        <SelectField label="Outlet" id="station_id" name="station_id" defaultValue="">
          <option value="">Unassigned</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add staff"}
      </Button>
    </form>
  );
}
