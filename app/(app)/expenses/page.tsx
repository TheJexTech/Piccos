import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { getBusinessOutlets } from "@/lib/business/outlets";
import { CategoriesSection } from "./categories-section";
import { NewExpenseForm } from "./new-expense-form";
import { ExpensesList } from "./expenses-list";
import type { Expense } from "@/lib/expenses/types";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);

  const canAccess = membership.role === "owner" || membership.role === "secretary";
  const isOwner = membership.role === "owner";

  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Expenses</h1>
        <p className="mt-4 text-sm text-muted">Only the owner and secretary can view expenses.</p>
      </div>
    );
  }

  const businessId = membership.businessId;

  const [outlets, { data: categories }, { data: expenses }] = await Promise.all([
    getBusinessOutlets(supabase, businessId),
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, correction_of_id, expense_categories(name)")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false })
      .limit(50)
      .returns<Expense[]>(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Expenses</h1>

      <div className="mt-6 flex flex-col gap-6">
        <CategoriesSection businessId={businessId} categories={categories ?? []} isOwner={isOwner} />
        <NewExpenseForm businessId={businessId} categories={categories ?? []} outlets={outlets} />
        <ExpensesList expenses={expenses ?? []} isOwner={isOwner} />
      </div>
    </div>
  );
}
