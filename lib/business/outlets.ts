// Every active outlet within the current business — the source of truth
// for the outlet selector shown on Dashboard/Revenue/Reports/Products/
// Expenses. An "outlet" is a `stations` row (existing table, M4): a
// physical location/chair within one business. Reused directly rather
// than building a second outlet concept — the same rows staff/products/
// transactions already reference via `station_id`.

import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Outlet = { id: string; name: string };

export async function getBusinessOutlets(
  supabase: SupabaseClient,
  businessId: string,
): Promise<Outlet[]> {
  const { data } = await supabase
    .from("stations")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .returns<Outlet[]>();

  return data ?? [];
}

// Resolves a `?outlet=` search param into either "all" (no station filter,
// every outlet combined) or a concrete station id. Anything absent,
// invalid, or explicitly "all" resolves to "all" — there's no fallback-to-
// a-single-business case anymore, since "all stations" is always a
// meaningful default within the one current business.
export function resolveOutletId(
  requestedOutlet: string | undefined,
  outlets: Outlet[],
): "all" | string {
  if (requestedOutlet && outlets.some((o) => o.id === requestedOutlet)) {
    return requestedOutlet;
  }
  return "all";
}
