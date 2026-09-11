import type { Expense } from "@/lib/expenses/types";

export function ExpensesList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No expenses recorded yet.</p>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div>
            <p className="text-black dark:text-zinc-50">
              {e.description || e.expense_categories?.name || "Expense"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(e.expense_date).toLocaleDateString()}
              {e.expense_categories?.name ? ` · ${e.expense_categories.name}` : ""}
            </p>
          </div>
          <p className="text-black dark:text-zinc-50">{Number(e.amount).toFixed(2)}</p>
        </li>
      ))}
    </ul>
  );
}
