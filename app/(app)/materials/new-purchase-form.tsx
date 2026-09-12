"use client";

import { useActionState, useState } from "react";
import { recordPurchase } from "@/lib/materials/actions";
import { initialMaterialActionState, type Material } from "@/lib/materials/types";
import { FormField } from "@/components/form-field";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NewPurchaseForm({ materials }: { materials: Material[] }) {
  const [state, formAction, pending] = useActionState(recordPurchase, initialMaterialActionState);
  const [today] = useState(todayLocal);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const total =
    quantity && unitCost && !Number.isNaN(Number(quantity)) && !Number.isNaN(Number(unitCost))
      ? (Number(quantity) * Number(unitCost)).toFixed(2)
      : null;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Record purchase</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="material_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Material
          </label>
          <select
            id="material_id"
            name="material_id"
            defaultValue=""
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="" disabled>
              Select material
            </option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
        </div>
        <FormField label="Supplier" name="supplier" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className="text-sm text-zinc-600 dark:text-zinc-400">
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
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="unit_cost" className="text-sm text-zinc-600 dark:text-zinc-400">
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
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Total cost</span>
          <p className="px-3 py-2 text-sm text-black dark:text-zinc-50">{total ?? "—"}</p>
        </div>
      </div>

      <FormField label="Purchase date" name="purchase_date" type="date" defaultValue={today} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Recording…" : "Record purchase"}
      </button>
    </form>
  );
}
