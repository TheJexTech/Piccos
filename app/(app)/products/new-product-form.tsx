"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProduct } from "@/lib/products/actions";
import { initialProductActionState } from "@/lib/products/types";
import { FormField } from "@/components/form-field";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type { Outlet } from "@/lib/business/outlets";

// Collapsed by default — a compact "Add product +" control, same spirit as
// the collapsed-by-default Products list right below it. Auto-collapses
// and clears after a successful add; closing without adding is free.
export function NewProductForm({ businessId, outlets }: { businessId: string; outlets: Outlet[] }) {
  const [expanded, setExpanded] = useState(false);
  const createProductWithBusiness = createProduct.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createProductWithBusiness,
    initialProductActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      setExpanded(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-fit rounded-full border border-dashed border-border-strong px-4 py-2 text-sm font-medium text-ink hover:border-brown-700 hover:text-brown-700"
      >
        + Add product
      </button>
    );
  }

  return (
    <SectionCard
      title="Add product"
      actions={
        <button type="button" onClick={() => setExpanded(false)} className="text-sm text-muted hover:underline">
          Cancel
        </button>
      }
    >
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Product name" name="name" required />
          <FormField label="Selling price" name="selling_price" type="number" required />
          <FormField label="Cost price" name="cost_price" type="number" required />
          <FormField label="Starting stock" name="stock_quantity" type="number" />
        </div>
        <SelectField label="Outlet" id="station_id" name="station_id" defaultValue="" className="sm:w-64">
          <option value="">Unassigned</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Adding…" : "Add Product"}
        </Button>
      </form>
    </SectionCard>
  );
}
