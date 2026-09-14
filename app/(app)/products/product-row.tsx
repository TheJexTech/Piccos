"use client";

import { useActionState } from "react";
import { updateProduct, deleteProduct } from "@/lib/products/actions";
import { initialProductActionState, type Product } from "@/lib/products/types";
import { FormField } from "@/components/form-field";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import type { Outlet } from "@/lib/business/outlets";

export function ProductRow({ product, outlets }: { product: Product; outlets: Outlet[] }) {
  const updateProductWithId = updateProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState(
    updateProductWithId,
    initialProductActionState,
  );

  return (
    <li className="rounded-xl border border-border p-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Name" name="name" defaultValue={product.name} required />
          <FormField
            label="Selling price"
            name="selling_price"
            type="number"
            defaultValue={String(product.selling_price)}
            required
          />
          <FormField
            label="Cost price"
            name="cost_price"
            type="number"
            defaultValue={String(product.cost_price)}
            required
          />
          <SelectField label="Status" id={`status-${product.id}`} name="status" defaultValue={product.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>

        <SelectField
          label="Outlet"
          id={`station-${product.id}`}
          name="station_id"
          defaultValue={product.station_id ?? ""}
          className="sm:w-64"
        >
          <option value="">Unassigned</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>

        {/* Not directly editable — it only changes by recording a sale, so
            it can never drift from the sales history that explains it. */}
        <p className="text-sm text-muted">
          Stock: <span className="font-medium text-ink">{product.stock_quantity}</span> (updates when a
          sale is recorded)
        </p>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>

      <form action={deleteProduct.bind(null, product.id)} className="mt-2">
        <button type="submit" className="text-sm text-danger hover:underline">
          Delete
        </button>
      </form>
    </li>
  );
}
