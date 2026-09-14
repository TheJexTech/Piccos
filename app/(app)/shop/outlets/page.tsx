import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { NextStepHint } from "@/components/next-step-hint";
import { SectionCard } from "@/components/ui/section-card";
import { OutletsList } from "./outlets-list";
import { NewOutletForm } from "./new-outlet-form";

export default async function OutletsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const isOwner = membership.role === "owner";

  const { data: stations } = await supabase
    .from("stations")
    .select("id, name, description, status")
    .eq("business_id", membership.businessId)
    .order("created_at", { ascending: true });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, display_name, station_id")
    .eq("business_id", membership.businessId);

  // Matches Activity's own "active" filter, so this hint never contradicts
  // whether Activity would actually let you record a transaction.
  const [{ count: staffCount }, { count: servicesCount }] = await Promise.all([
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
    <div>
      <h1 className="text-2xl font-semibold text-ink">Outlets</h1>
      <div className="mt-4">
        <ShopSubNav active="/shop/outlets" />
      </div>
      <NextStepHint
        counts={{
          stations: (stations ?? []).filter((s) => s.status === "active").length,
          staff: staffCount ?? 0,
          services: servicesCount ?? 0,
        }}
      />

      {isOwner && (
        <SectionCard title="Add outlet" className="mb-6">
          <NewOutletForm businessId={membership.businessId} />
        </SectionCard>
      )}

      <OutletsList outlets={stations ?? []} staff={staff ?? []} isOwner={isOwner} />
    </div>
  );
}
