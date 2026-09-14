"use client";

import { useActionState } from "react";
import { updateService, deleteService } from "@/lib/services/actions";
import { initialServiceActionState, type Service } from "@/lib/services/types";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/constants";
import { FormField } from "@/components/form-field";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";

export function ServiceRow({ service }: { service: Service }) {
  const updateServiceWithId = updateService.bind(null, service.id);
  const [state, formAction, pending] = useActionState(
    updateServiceWithId,
    initialServiceActionState,
  );

  return (
    <li className="rounded-xl border border-border p-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Name"
            name="name"
            defaultValue={service.name}
            required
            suggestions={SERVICE_NAME_SUGGESTIONS}
          />
          <FormField
            label="Price"
            name="price"
            type="number"
            defaultValue={String(service.price)}
            required
          />
          <SelectField label="Status" id={`status-${service.id}`} name="status" defaultValue={service.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>

      <form action={deleteService.bind(null, service.id)} className="mt-2">
        <button type="submit" className="text-sm text-danger hover:underline">
          Delete
        </button>
      </form>
    </li>
  );
}
