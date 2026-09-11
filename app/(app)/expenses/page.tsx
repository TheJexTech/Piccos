import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoriesSection } from "./categories-section";
import { NewExpenseForm } from "./new-expense-form";
import { ExpensesList } from "./expenses-list";
import type { Expense } from "@/lib/expenses/types";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding/business");

  const canAccess = membership.role === "owner" || membership.role === "secretary";
  const isOwner = membership.role === "owner";

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Expenses</h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Only the owner and secretary can view expenses.
        </p>
      </div>
    );
  }

  const businessId = membership.business_id;

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, expense_categories(name)")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false })
      .limit(50)
      .returns<Expense[]>(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Expenses</h1>

      <div className="mt-6">
        <CategoriesSection businessId={businessId} categories={categories ?? []} isOwner={isOwner} />
      </div>

      <div className="mt-6">
        <NewExpenseForm businessId={businessId} categories={categories ?? []} />
      </div>

      <ExpensesList expenses={expenses ?? []} />
    </div>
  );
}
