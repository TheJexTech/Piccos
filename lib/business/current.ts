// Resolves which business (outlet) the current request is scoped to, now
// that an owner can belong to more than one. Every page used to do its own
// `.eq("user_id", user.id).eq("status","active").limit(1).maybeSingle()`
// query, which silently assumed exactly one membership — this is the one
// place that assumption used to live, now replaced by an explicit "current
// outlet" cookie with a safe fallback.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

export const CURRENT_BUSINESS_COOKIE = "current_business_id";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CurrentMembership = { businessId: string; role: string };

export async function getCurrentMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentMembership | null> {
  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get(CURRENT_BUSINESS_COOKIE)?.value;

  if (cookieBusinessId) {
    const { data } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", userId)
      .eq("business_id", cookieBusinessId)
      .eq("status", "active")
      .maybeSingle();
    if (data) return { businessId: data.business_id, role: data.role };
  }

  // No cookie, or it pointed at a business the user is no longer active in
  // (switched accounts, removed from that outlet, etc.) — fall back to
  // their longest-standing membership rather than an arbitrary one.
  const { data: fallback } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallback ? { businessId: fallback.business_id, role: fallback.role } : null;
}

// For every page that requires an outlet to render at all (everything
// except the onboarding and outlet-list pages themselves).
export async function requireCurrentMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentMembership> {
  const membership = await getCurrentMembership(supabase, userId);
  if (!membership) redirect("/onboarding/business");
  return membership;
}
