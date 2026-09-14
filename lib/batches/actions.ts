"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BatchActionState, RecordBatchInput } from "@/lib/batches/types";

// Called directly from the client (not as a <form action>) — the payload is
// a nested structure (N service lines, N payment rows) that doesn't map
// cleanly onto FormData's flat key/value shape. Server Actions can be
// invoked as plain async functions like this; validation and the actual
// atomic multi-table insert both happen server-side in record_batch_activity.
export async function recordBatchActivity(
  businessId: string,
  input: RecordBatchInput,
): Promise<BatchActionState> {
  if (!input.staffId) {
    return { error: "Select a staff member." };
  }
  if (input.services.length === 0) {
    return { error: "Add at least one service." };
  }
  for (const service of input.services) {
    if (!service.serviceId || !Number.isFinite(service.quantity) || service.quantity <= 0) {
      return { error: "Each service needs a selection and a quantity greater than zero." };
    }
  }
  for (const payment of [...input.payments, ...input.tipPayments]) {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      return { error: "Each payment breakdown row needs an amount greater than zero." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_batch_activity", {
    p_business_id: businessId,
    p_staff_id: input.staffId,
    p_batch_date: input.batchDate || null,
    p_services: input.services.map((s) => ({ service_id: s.serviceId, quantity: s.quantity })),
    p_tip_amount: input.tipAmount || 0,
    p_payments: input.payments.map((p) => ({ payment_method: p.paymentMethod, amount: p.amount })),
    p_tip_payments: input.tipPayments.map((p) => ({ payment_method: p.paymentMethod, amount: p.amount })),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activity");
  return { error: null };
}

export async function voidBatch(
  batchId: string,
  _prevState: BatchActionState,
  formData: FormData,
): Promise<BatchActionState> {
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    return { error: "A reason is required to void a batch." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_batch", {
    p_batch_id: batchId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activity");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/revenue");
  return { error: null };
}
