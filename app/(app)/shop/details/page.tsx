import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { ShopForm } from "./shop-form";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { SetupChecklist } from "@/components/setup-checklist";
import type { Business } from "@/lib/business/types";

export default async function ShopDetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", membership.businessId)
    .single<Business>();

  if (!business) {
    redirect("/shop");
  }

  const isOwner = membership.role === "owner";

  // Matches Activity's own "active" filter, so the checklist never
  // contradicts whether Activity would actually let you record a sale.
  const [{ count: stationsCount }, { count: staffCount }, { count: servicesCount }] =
    await Promise.all([
      supabase
        .from("stations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", membership.businessId)
        .eq("status", "active"),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("business_id", membership.businessId)
        .eq("status", "active"),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", membership.businessId)
        .eq("status", "active"),
    ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link href="/shop" className="text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50">
        ← My Shops
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">{business.name}</h1>
      <ShopSubNav active="/shop/details" />
      <SetupChecklist
        counts={{
          stations: stationsCount ?? 0,
          staff: staffCount ?? 0,
          services: servicesCount ?? 0,
        }}
      />
      <ShopForm business={business} readOnly={!isOwner} />

      {isOwner && (
        <Link
          href="/settings/audit-log"
          className="mt-8 inline-block text-sm text-zinc-500 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View audit log
        </Link>
      )}
    </div>
  );
}
