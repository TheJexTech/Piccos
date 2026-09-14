"use client";

import { useActionState, useState } from "react";
import { createExpense } from "@/lib/expenses/actions";
import { initialExpenseActionState, type ExpenseCategory } from "@/lib/expenses/types";
import { FormField } from "@/components/form-field";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type { Outlet } from "@/lib/business/outlets";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NewExpenseForm({
  businessId,
  categories,
  outlets,
}: {
  businessId: string;
  categories: ExpenseCategory[];
  outlets: Outlet[];
}) {
  const createExpenseWithBusiness = createExpense.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createExpenseWithBusiness,
    initialExpenseActionState,
  );
  const [today] = useState(todayLocal);

  return (
    <SectionCard title="Record expense">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Amount" name="amount" type="number" required />
          <SelectField label="Category" id="category_id" name="category_id" defaultValue="">
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Description" name="description" />
          <FormField label="Date" name="expense_date" type="date" defaultValue={today} />
        </div>

        <SelectField label="Outlet" id="station_id" name="station_id" defaultValue="" className="sm:w-64">
          <option value="">Shop-wide (all outlets)</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record expense"}
        </Button>
      </form>
    </SectionCard>
  );
}
