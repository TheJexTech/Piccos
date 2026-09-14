"use client";

import { useActionState, useState } from "react";
import { recordPurchase } from "@/lib/materials/actions";
import { initialMaterialActionState } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";
import { selectClasses } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RecordPurchaseForm({ materialId }: { materialId: string }) {
  const recordPurchaseForMaterial = recordPurchase.bind(null, materialId);
  const [state, formAction, pending] = useActionState(
    recordPurchaseForMaterial,
    initialMaterialActionState,
  );
  const [today] = useState(todayLocal);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const total =
    quantity && unitCost && !Number.isNaN(Number(quantity)) && !Number.isNaN(Number(unitCost))
      ? (Number(quantity) * Number(unitCost)).toFixed(2)
      : null;

  return (
    <SectionCard title="Record purchase">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="quantity" className="text-xs font-medium text-ink-secondary">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={selectClasses()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="unit_cost" className="text-xs font-medium text-ink-secondary">
              Unit cost
            </label>
            <input
              id="unit_cost"
              name="unit_cost"
              type="number"
              step="0.01"
              required
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={selectClasses()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-secondary">Total cost</span>
            <p className="px-3 py-2 text-sm text-ink">{total ?? "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Supplier" name="supplier" />
          <FormField label="Purchase date" name="purchase_date" type="date" defaultValue={today} />
        </div>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record purchase"}
        </Button>
      </form>
    </SectionCard>
  );
}
