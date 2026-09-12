"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionActionState } from "@/lib/transactions/types";

export async function createTransaction(
  businessId: string,
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const serviceId = formData.get("service_id") as string;
  const staffId = formData.get("staff_id") as string;
  const stationId = (formData.get("station_id") as string) || null;
  const paymentMethod = formData.get("payment_method") as string;
  const transactionDateRaw = formData.get("transaction_date") as string;

  const amountRaw = formData.get("amount") as string;
  const amount = Number(amountRaw);

  if (!serviceId) return { error: "Select a service." };
  if (!staffId) return { error: "Select a staff member." };
  if (!paymentMethod) return { error: "Select a payment method." };
  if (!amountRaw || Number.isNaN(amount) || amount < 0) {
    return { error: "Enter a valid amount." };
  }

  const supabase = await createClient();

  // Snapshot the service's current name/price server-side — never trust
  // client-supplied values for the historical record. `amount` is the
  // actual amount charged (may differ from list price); service_name/
  // service_price capture what the service was at sale time.
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("name, price")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return { error: "Selected service not found." };
  }

  const { error } = await supabase.from("transactions").insert({
    business_id: businessId,
    staff_id: staffId,
    station_id: stationId,
    service_id: serviceId,
    service_name: service.name,
    service_price: service.price,
    amount,
    payment_method: paymentMethod,
    ...(transactionDateRaw ? { transaction_date: new Date(transactionDateRaw).toISOString() } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activity");
  return { error: null };
}

export async function voidTransaction(
  transactionId: string,
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    return { error: "A reason is required to void a transaction." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_transaction", {
    p_transaction_id: transactionId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activity");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { error: null };
}
