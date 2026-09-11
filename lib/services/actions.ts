"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ServiceActionState } from "@/lib/services/types";

function parsePrice(formData: FormData): number | null {
  const raw = formData.get("price") as string;
  const price = Number(raw);
  if (!raw || Number.isNaN(price) || price < 0) return null;
  return price;
}

export async function createService(
  businessId: string,
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Service name is required." };
  }

  const price = parsePrice(formData);
  if (price === null) {
    return { error: "Enter a valid price." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    business_id: businessId,
    name,
    description: (formData.get("description") as string) || null,
    price,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/shop/services");
  return { error: null };
}

export async function updateService(
  serviceId: string,
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Service name is required." };
  }

  const price = parsePrice(formData);
  if (price === null) {
    return { error: "Enter a valid price." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name,
      description: (formData.get("description") as string) || null,
      price,
      status: (formData.get("status") as string) || "active",
    })
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/shop/services");
  return { error: null };
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", serviceId);
  revalidatePath("/shop/services");
}
