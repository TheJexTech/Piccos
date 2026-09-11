"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BusinessActionState } from "@/lib/business/types";

export async function createBusiness(
  _prevState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Business name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business_with_owner", {
    p_name: name,
    p_description: (formData.get("description") as string) || null,
    p_phone: (formData.get("phone") as string) || null,
    p_email: (formData.get("email") as string) || null,
    p_address: (formData.get("address") as string) || null,
    p_city: (formData.get("city") as string) || null,
    p_state: (formData.get("state") as string) || null,
    p_country: (formData.get("country") as string) || null,
    p_currency: (formData.get("currency") as string) || "NGN",
    p_timezone: (formData.get("timezone") as string) || "Africa/Lagos",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function updateBusiness(
  businessId: string,
  _prevState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Business name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      description: (formData.get("description") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      country: (formData.get("country") as string) || null,
      currency: (formData.get("currency") as string) || "NGN",
      timezone: (formData.get("timezone") as string) || "Africa/Lagos",
    })
    .eq("id", businessId);

  if (error) {
    return { error: error.message };
  }

  redirect("/shop");
}
