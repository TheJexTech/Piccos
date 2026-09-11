"use client";

import { useActionState } from "react";
import { updateService, deleteService } from "@/lib/services/actions";
import { initialServiceActionState, type Service } from "@/lib/services/types";
import { FormField } from "@/components/form-field";

export function ServiceRow({ service }: { service: Service }) {
  const updateServiceWithId = updateService.bind(null, service.id);
  const [state, formAction, pending] = useActionState(
    updateServiceWithId,
    initialServiceActionState,
  );

  return (
    <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <FormField label="Name" name="name" defaultValue={service.name} required />
          <FormField
            label="Description"
            name="description"
            defaultValue={service.description ?? ""}
          />
          <FormField
            label="Price"
            name="price"
            type="number"
            defaultValue={String(service.price)}
            required
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`status-${service.id}`}
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              Status
            </label>
            <select
              id={`status-${service.id}`}
              name="status"
              defaultValue={service.status}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <form action={deleteService.bind(null, service.id)} className="mt-2">
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete
        </button>
      </form>
    </li>
  );
}
