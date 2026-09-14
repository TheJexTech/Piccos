"use client";

import { useActionState } from "react";
import { createExpenseCategory, deleteExpenseCategory } from "@/lib/expenses/actions";
import { initialExpenseActionState, type ExpenseCategory } from "@/lib/expenses/types";
import { SectionCard } from "@/components/ui/section-card";
import { selectClasses } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";

export function CategoriesSection({
  businessId,
  categories,
  isOwner,
}: {
  businessId: string;
  categories: ExpenseCategory[];
  isOwner: boolean;
}) {
  const createCategoryWithBusiness = createExpenseCategory.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createCategoryWithBusiness,
    initialExpenseActionState,
  );

  return (
    <SectionCard title="Categories">
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No categories yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-full border border-border-strong px-3 py-1 text-sm text-ink"
            >
              {c.name}
              {isOwner && (
                <form action={deleteExpenseCategory.bind(null, c.id)}>
                  <button type="submit" className="text-danger hover:underline">
                    ×
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="category-name" className="text-xs font-medium text-ink-secondary">
            New category
          </label>
          <input id="category-name" name="name" type="text" className={selectClasses()} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </SectionCard>
  );
}
