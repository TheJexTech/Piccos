import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/business/current";
import { switchBusiness } from "@/lib/business/actions";

type ShopMembership = {
  business_id: string;
  businesses: { name: string; city: string | null; state: string | null } | null;
};

export default async function MyShopsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, businesses(name, city, state)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .returns<ShopMembership[]>();

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding/business");
  }

  const shops = await Promise.all(
    memberships.map(async (m) => {
      const [{ count: staffCount }, { count: stationsCount }] = await Promise.all([
        supabase
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("business_id", m.business_id)
          .eq("status", "active"),
        supabase
          .from("stations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", m.business_id)
          .eq("status", "active"),
      ]);
      return {
        businessId: m.business_id,
        name: m.businesses?.name ?? "Untitled shop",
        location: [m.businesses?.city, m.businesses?.state].filter(Boolean).join(", "),
        staffCount: staffCount ?? 0,
        stationsCount: stationsCount ?? 0,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">My Shops</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Each shop keeps its own stations, staff, services, activity, revenue, and expenses.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {shops.map((shop) => (
          <li
            key={shop.businessId}
            className="flex items-center justify-between rounded border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-black dark:text-zinc-50">{shop.name}</p>
              {shop.location && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{shop.location}</p>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {shop.staffCount} staff · {shop.stationsCount} stations
              </p>
            </div>
            <form action={switchBusiness.bind(null, shop.businessId)}>
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-black dark:border-zinc-700 dark:text-zinc-50"
              >
                View / Edit
              </button>
            </form>
          </li>
        ))}
      </ul>

      <Link
        href="/shop/new"
        className="mt-6 inline-block text-sm font-medium text-black underline dark:text-zinc-50"
      >
        + Add another shop
      </Link>
    </div>
  );
}
