export type ExpenseActionState = { error: string | null };

export const initialExpenseActionState: ExpenseActionState = { error: null };

export type ExpenseCategory = { id: string; name: string };

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  correction_of_id: string | null;
  expense_categories: { name: string } | null;
};
