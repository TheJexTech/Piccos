import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// cache() collapses every createClient() call within one request into the
// same client instance — the layout and every page used to each create
// their own, which meant lib/business/current.ts's cache()-wrapped helpers
// below never actually deduped (different client object = different cache
// key). One shared instance per request, never across requests.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component during render, where
            // cookies cannot be mutated. Safe to ignore when middleware is
            // also refreshing the session.
          }
        },
      },
    },
  );
});
