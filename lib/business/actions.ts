"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_BUSINESS_COOKIE } from "@/lib/business/current";
import type { BusinessActionState } from "@/lib/business/types";

async function setCurrentBusiness(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Used both for the very first shop (onboarding) and for "+ Add another
// shop" — create_business_with_owner has no uniqueness check on the owner,
// so an already-onboarded owner calling this again just gets a second,
// fully independent outlet. Either way you land switched into the new
// shop's setup checklist, not an empty Dashboard.
export async function createBusiness(
  _prevState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Business name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_business_with_owner", {
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

  await setCurrentBusiness(data.id);
  redirect("/shop/details");
}

// Switches which outlet subsequent page loads resolve to. Membership is
// re-verified server-side (never trust a client-supplied business id) —
// this only ever succeeds for a business the user actually belongs to.
export async function switchBusiness(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/shop");
  }

  await setCurrentBusiness(businessId);
  redirect("/shop/details");
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

  redirect("/shop/details");
}
