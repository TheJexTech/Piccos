"use client";

import { useActionState, useState } from "react";
import { createExpense } from "@/lib/expenses/actions";
import { initialExpenseActionState, type ExpenseCategory } from "@/lib/expenses/types";
import { FormField } from "@/components/form-field";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NewExpenseForm({
  businessId,
  categories,
}: {
  businessId: string;
  categories: ExpenseCategory[];
}) {
  const createExpenseWithBusiness = createExpense.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createExpenseWithBusiness,
    initialExpenseActionState,
  );
  const [today] = useState(todayLocal);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Record expense</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Amount" name="amount" type="number" required />
        <div className="flex flex-col gap-1">
          <label htmlFor="category_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue=""
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Description" name="description" />
        <FormField label="Date" name="expense_date" type="date" defaultValue={today} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Recording…" : "Record expense"}
      </button>
    </form>
  );
}
