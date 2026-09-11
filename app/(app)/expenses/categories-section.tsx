"use client";

import { useActionState } from "react";
import { createExpenseCategory, deleteExpenseCategory } from "@/lib/expenses/actions";
import { initialExpenseActionState, type ExpenseCategory } from "@/lib/expenses/types";

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
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Categories</h2>

      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No categories yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1 text-sm text-black dark:border-zinc-700 dark:text-zinc-50"
            >
              {c.name}
              {isOwner && (
                <form action={deleteExpenseCategory.bind(null, c.id)}>
                  <button type="submit" className="text-red-600 hover:underline">
                    ×
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-3 flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="category-name" className="text-sm text-zinc-600 dark:text-zinc-400">
            New category
          </label>
          <input
            id="category-name"
            name="name"
            type="text"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
