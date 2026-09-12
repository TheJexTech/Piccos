"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseActionState } from "@/lib/expenses/types";

export async function createExpenseCategory(
  businessId: string,
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Category name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").insert({
    business_id: businessId,
    name,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/expenses");
  return { error: null };
}

export async function deleteExpenseCategory(categoryId: string) {
  const supabase = await createClient();
  await supabase.from("expense_categories").delete().eq("id", categoryId);
  revalidatePath("/expenses");
}

export async function createExpense(
  businessId: string,
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const amountRaw = formData.get("amount") as string;
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount < 0) {
    return { error: "Enter a valid amount." };
  }

  const categoryId = (formData.get("category_id") as string) || null;
  const description = (formData.get("description") as string) || null;
  const expenseDateRaw = formData.get("expense_date") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    business_id: businessId,
    category_id: categoryId,
    amount,
    description,
    ...(expenseDateRaw ? { expense_date: expenseDateRaw } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/expenses");
  return { error: null };
}

export async function voidExpense(
  expenseId: string,
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    return { error: "A reason is required to void an expense." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_expense", {
    p_expense_id: expenseId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { error: null };
}
