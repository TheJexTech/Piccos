import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "./new-transaction-form";
import { TransactionsList } from "./transactions-list";
import type { Transaction } from "@/lib/transactions/types";

export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding/business");

  const businessId = membership.business_id;

  const [{ data: staff }, { data: stations }, { data: services }, { data: transactions }] =
    await Promise.all([
      supabase
        .from("staff")
        .select("id, display_name")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("display_name", { ascending: true }),
      supabase
        .from("stations")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, price")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, transaction_date, amount, payment_method, service_name, staff:staff_id(display_name), stations:station_id(name)",
        )
        .eq("business_id", businessId)
        .order("transaction_date", { ascending: false })
        .limit(50)
        .returns<Transaction[]>(),
    ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Activity</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Record each service as it happens.
      </p>

      <div className="mt-6">
        {(staff ?? []).length === 0 || (services ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Add at least one active staff member and one active service before recording
            transactions.
          </p>
        ) : (
          <NewTransactionForm
            businessId={businessId}
            staff={staff ?? []}
            stations={stations ?? []}
            services={services ?? []}
          />
        )}
      </div>

      <TransactionsList transactions={transactions ?? []} />
    </div>
  );
}
